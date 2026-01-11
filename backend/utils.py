from datetime import datetime, timedelta, date, timezone
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
import requests
import xml.etree.ElementTree as ET
from .mappings import lookup_area
from .db import pool
import asyncio
from .mqtt_class import MQTTClass
from .config import ENTSOE_API_KEY,ESIOS_API_KEY




def bz_to_code(bz):

    area = lookup_area(bz)
    code = area.value

    return code

def fetch_entsoe_DA(start_str_date, end_str_date, code):

    ENTSOE_URL = "https://web-api.tp.entsoe.eu/api"

    params = {
        'documentType': 'A44',
        'periodStart': start_str_date,
        'periodEnd': end_str_date,
        'out_Domain': code,
        'in_Domain': code,
        'contract_MarketAgreement.type': 'A01',
        'securityToken': ENTSOE_API_KEY    
    }

    response = requests.get(ENTSOE_URL, params=params)
    root = ET.fromstring(response.text) 

    data = []
    for ts in root.findall('.//{*}TimeSeries'):

        day_data = []
        for price,interval in zip(ts.findall('.//{*}price.amount'), ts.findall('.//{*}position')):

            # Append all price and interval entries 
            row = {
                    "values": float(price.text),
                    "interval": int(interval.text),
                    }

            day_data.append(row)

        total_stamps = 24 if len(day_data) <24 else 96

        values_column_title = 'DA'
        prices_df = pd.DataFrame({values_column_title: [row['values'] for row in day_data],
                                'interval': [row['interval'] for row in day_data]})
        full_intervals = pd.DataFrame({'interval': range(1,(total_stamps+1))})
        day_data_filled = full_intervals.merge(prices_df, on='interval', how='left')
        day_data = day_data_filled[values_column_title].ffill() 

        if total_stamps==24:    
            day_data = [
                {values_column_title: price}
                for idx, price in enumerate(day_data)
                for i in range(idx*4, idx*4 + 4)
                ]
        else:
            day_data = [{values_column_title: v} for v in day_data]

        data.extend(day_data)

    start_dt = datetime.strptime(start_str_date, "%Y%m%d%H%M")
    data = pd.DataFrame(data)   
    data["datetime"] = [start_dt + n*timedelta(minutes=15)  for n in range(len(data))]   
    
    return data


def get_prices_new(bz=str):

    date_today = date.today()


    start_str_date = f"{date_today.year:04d}{date_today.month:02d}{date_today.day:02d}0000"
    end_str_date = start_str_date

    code = bz_to_code(bz)

    da_prices = fetch_entsoe_DA(start_str_date, end_str_date, code)

    return da_prices

def get_prices_pvpc(start_charge_timestamp, area=str):

    spain_tz = ZoneInfo("Europe/Madrid")
    utc = ZoneInfo("UTC")

    now_spain = datetime.fromisoformat(start_charge_timestamp.replace("Z", "+00:00")).astimezone(spain_tz)

    cutoff = now_spain.replace(hour=20, minute=30, second=0, microsecond=0)

    if now_spain >= cutoff:
        # if hour after 20:30 then PVPC are already published and can be accessed to optimize with next days night hours
        start_dt = now_spain.replace(
            hour=20, minute=0, second=0, microsecond=0
        )

        end_dt = (now_spain + timedelta(days=1)).replace(
            hour=19, minute=0, second=0, microsecond=0
        )
    else:
        start_dt = now_spain.replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        end_dt = now_spain.replace(
            hour=23, minute=0, second=0, microsecond=0
        )

    start_dt = start_dt.astimezone(utc)
    end_dt = end_dt.astimezone(utc)

    pvpc_url = "https://api.esios.ree.es/indicators/1001"   

    # params for request
    params = {"start_date":start_dt,
              "end_date":end_dt}

    headers = {
    "Accept": "application/json; application/vnd.esios-api-v1+json",
    "Content-Type": "application/json",
    "x-api-key": ESIOS_API_KEY,
    }

    response_pvpc = requests.get(pvpc_url, params=params, headers=headers)
    content = response_pvpc.json()
    pvpc_hour_values = [_dict['value'] for _dict in content['indicator']['values'] if _dict['geo_name']=='Península']

    return pvpc_hour_values


def select_cheapest_hours(start_charge_timestamp, df, end_charge, soc):

    spain_tz = ZoneInfo("Europe/Madrid")
    start_charge = datetime.fromisoformat(start_charge_timestamp.replace("Z", "+00:00")).astimezone(spain_tz)

    if end_charge<start_charge.hour:
        hours = [i for i in range(start_charge.hour,24)]
        hours.extend([i for i in range(end_charge)])
    else:
        hours = [i for i in range(start_charge.hour,end_charge)]

    cutoff = start_charge.replace(hour=20, minute=30, second=0, microsecond=0)

    if start_charge >= cutoff:
        diff_to_referance_hour = start_charge.hour - 20 # in this case ref hour is 20:00
    else:
        diff_to_referance_hour = start_charge.hour # in this case ref hour is 00:00


    selected_hours = [(i,df[j]) for i,j in zip(hours,range(diff_to_referance_hour,diff_to_referance_hour+len(hours)))]

    #selected_hours = [x for x in hourly_values if x[0] in hours]

    #selected_hours = [(i,df[i]) for i in hours]
    sorted_hours = sorted(selected_hours, key=lambda x: x[1])

    num_of_charge_hours_needed = round((1-soc/100)*4) # this can be interpolated if user inputs SoC of batt. Ex: assuming it takes 4 hours to cahrge from 0 to 100%, if charge is x then charge time is (1-x/100)*4
    
    final_hours = [x[0] for x in sorted_hours[:num_of_charge_hours_needed]]
    
    if start_charge in final_hours and datetime.now().minute > 20:
        final_hours = [x[0] for x in sorted_hours[:num_of_charge_hours_needed+1]]

    return final_hours


def seconds_until_next_hour():
    now = datetime.now()
    next_hour = (now + timedelta(hours=1)).replace(
        minute=0, second=0, microsecond=0
    )
    return (next_hour - now).total_seconds()


def create_table():
    CREATE_TABLE_SQL = """
        CREATE TABLE IF NOT EXISTS power_readings (
            timestamp TIMESTAMPTZ NOT NULL,
            device_id TEXT NOT NULL,
            power DOUBLE PRECISION NOT NULL
        );
    """
    CREATE_INDEX_SQL = """
        CREATE INDEX IF NOT EXISTS idx_power_device_ts
        ON power_readings (timestamp DESC, device_id);
    """

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            cur.execute(CREATE_INDEX_SQL)

async def charge(start_charge_timestamp, hours, minutes, soc, controller: MQTTClass):

    pvpc_prices = get_prices_pvpc(start_charge_timestamp)

    end_charge_hour = hours # to be inputted by user in 24h format
    charging_hours = select_cheapest_hours(start_charge_timestamp, pvpc_prices, end_charge_hour, soc)

    create_table() # creates postgresql table first time in case it is not created

    await asyncio.to_thread(controller.run_charging_schedule, charging_hours, end_charge_hour)

    return controller


def extract_power_readings(start_dt,end_dt):

    EXTRACT_TOTAL_POWER_SQL = """
        WITH time_buckets AS (
            SELECT generate_series(
                date_trunc('hour', %s::timestamp),
                date_trunc('hour', %s::timestamp) - interval '120 seconds',
                interval '120 seconds'
            ) AS ts_120s
        ),
        bucketed_power AS (
            SELECT
                date_trunc('hour', tb.ts_120s) AS hour_ts,
                tb.ts_120s,
                AVG(pr.power) AS avg_power_120s
            FROM time_buckets tb
            LEFT JOIN power_readings pr
                ON to_timestamp(
                    floor(extract(epoch FROM pr.timestamp) / 120) * 120
                ) = tb.ts_120s
            GROUP BY hour_ts, tb.ts_120s
        )
        SELECT
            hour_ts AS timestamp,
            SUM(COALESCE(avg_power_120s, 0) * 120.0 / 3600.0) AS total_power
        FROM bucketed_power
        GROUP BY hour_ts
        ORDER BY hour_ts;

    """

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(EXTRACT_TOTAL_POWER_SQL, (start_dt, (datetime.strptime(end_dt, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')))
            results = cur.fetchall()

    return results

    
def historic_prices_pvpc(start_dt, end_dt):

    spain_tz = ZoneInfo("Europe/Madrid")
    utc = ZoneInfo("UTC")

    start_dt = datetime.strptime(start_dt, "%Y-%m-%d").replace(tzinfo=spain_tz)
    end_dt   = datetime.strptime(end_dt, "%Y-%m-%d").replace(tzinfo=spain_tz) + timedelta(days=1) - timedelta(hours=1)

    start_dt = start_dt.astimezone(utc)
    end_dt = end_dt.astimezone(utc)

    pvpc_url = "https://api.esios.ree.es/indicators/1001"   

    # params for request
    params = {"start_date":start_dt,
              "end_date":end_dt}

    headers = {
    "Accept": "application/json; application/vnd.esios-api-v1+json",
    "Content-Type": "application/json",
    "x-api-key": "ea876fb64dfd6c269a411c66ccf3d13ebf07363e1090e0f26e62752e50d754ec",
    }

    response_pvpc = requests.get(pvpc_url, params=params, headers=headers)
    content = response_pvpc.json()
    pvpc_hour_values = [(_dict['datetime_utc'],_dict['value']) for _dict in content['indicator']['values'] if _dict['geo_name']=='Península']

    return pvpc_hour_values

