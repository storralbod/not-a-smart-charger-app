import asyncio
from fastapi import FastAPI, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import json
from datetime import datetime, timezone
from .utils import *
from .mqtt_class import *
from .db import pool
from .session_manager import session
from .config import MQTT_SERVER, MQTT_PORT, SHELLY_ID


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     
    allow_credentials=True,
    allow_methods=["*"],       
    allow_headers=["*"],       
)


@app.get("/")
def root():
    return {"message": "Hello, backend server is running!"}

@app.websocket("/ws/power")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    try:
        while True:
            await ws.receive_text()  
    except:
        clients.remove(ws)


@app.post("/api/charge")
async def start_charge(start_charge_timestamp:str, hours:int,minutes:int,soc:int):
    
    #if session.task and not session.task.done():
    #    print("Already Charging")
    #    return {"status": "already charging"}

    loop = asyncio.get_running_loop()
    controller = MQTTClass(
        device_id= SHELLY_ID,
        broker= MQTT_SERVER,
        port=MQTT_PORT,
        loop=loop
    )
    controller.connect()
    controller.check_online_status()
    
    print("Starting charging session")

    session.controller = controller
    session.task = asyncio.create_task(charge(start_charge_timestamp, hours, minutes, soc, controller))
    return {"status":"started"}

@app.get("/api/charging_schedule")
async def get_charging_schedule(start_charge_timestamp:str, hours: int, soc: int):
    pvpc_prices = get_prices_pvpc(start_charge_timestamp)
    charging_hours = select_cheapest_hours(start_charge_timestamp, pvpc_prices, hours, soc)

    return {
        "charging_hours": charging_hours
    }

@app.get("/api/power")
def get_power(hours: int = 24):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    timestamp,
                    power
                FROM power_readings
                WHERE timestamp > NOW() - (%s * INTERVAL '1 hour')
                ORDER BY timestamp ASC
            """, (hours,))
            rows = cur.fetchall()

    return [
        {
            "timestamp": timestamp.isoformat(),
            "power": float(power),
        }
        for timestamp, power in rows
    ]

@app.post("/api/stop_charging")
async def stop_charging():
    if session.controller is None:
        return {"status": "no active charging session"}

    await asyncio.to_thread(session.controller.force_stop_charging)

    if session.task:
        session.task.cancel()
        session.task = None

    session.controller = None

    return {"status": "stopping charging"}

@app.get("/api/get_historic_power")
def get_historic_power(start_dt, end_dt):

    results = extract_power_readings(start_dt, end_dt)

    return [
        {
            "timestamp": timestamp.astimezone(timezone.utc).isoformat(),
            "power": float(power),
        }
        for timestamp, power in results
    ]

@app.get("/api/get_historic_pvpc_prices")
def get_historic_prices_pvpc(start_dt, end_dt):

    results = historic_prices_pvpc(start_dt, end_dt)

    return [
        {
            "timestamp": datetime.fromisoformat(timestamp.replace("Z", "+00:00")).isoformat(),
            "price": float(prices),
        }
        for timestamp, prices in results
    ]

@app.get("/api/get_historic_cost")
def get_historic_costs(start_dt:str,end_dt:str):

    power_consumption = get_historic_power(start_dt, end_dt)
    pvpc_prices = get_historic_prices_pvpc(start_dt, end_dt)

    power_consumption_df = pd.DataFrame(power_consumption)
    pvpc_prices_df = pd.DataFrame(pvpc_prices)
    print(power_consumption_df)
    print(pvpc_prices_df)
    merged_df = power_consumption_df.merge(
        pvpc_prices_df,
        on="timestamp",
        how="inner" 
    )

    merged_df["cost"] = merged_df["power"]/1e6 * merged_df["price"]

    merged_df["timestamp"] = pd.to_datetime(merged_df["timestamp"], utc=True)
    merged_df["timestamp_spain"] = merged_df["timestamp"].dt.tz_convert("Europe/Madrid")

    merged_df["year"] = merged_df["timestamp_spain"].dt.year
    merged_df["month"] = merged_df["timestamp_spain"].dt.month

    monthly_costs = (
        merged_df
        .groupby(["year", "month"], as_index=False)
        .agg(total_cost=("cost", "sum"))
    )
    print(monthly_costs)

    return monthly_costs.to_dict(orient="records")



        
























''''

@app.get('/api')
def get_root():
    return("FastAPI backend")


# get EV user details (user needs to have EV car, can be checked by making it mandatory to plug, if after X minuted car is not detected to be plugged in, charged extra)
@app.get('/api/user_info')
def user_info(user_id: str):

    user = users[user_id]
    user_plugged = user['plugged'] #if plugged car also parked obviously
    user_current_consumption = user['current_consumption']
    user_total_consumption = user['total_consumption']

    historical_user = historical_users[user_id]
    user_historical_consumption = {
        'datetime': historical_user['datetime'],
        'consumption': historical_user['consumption']
    }

    return ...

@app.get('/api/charger_info')
def charger_info(charger_id: str):

    charger = chargers[charger_id]
    charger_current_consumption = charger['current_consumption']
    charger_total_consumption = user['total_consumption']

    historical_charger = historical_charger[charger_id]
    charger_historical_consumption = {
        'datetime': historical_charger['datetime'],
        'consumption': historical_charger['consumption']
    }

    return ...

@app.get('/api/sessions_info')
def session_info(session_id: str):

    session = sessions[session_id]

    session_user = session['user']
    session_charger = session['charger']

    #timestamps of recorded charging session consumption timeseries
    session_consumption = {
        'datetime': session['datetime'],
        'consumption': session['consumption']
    } 

    return ...

'''


    


