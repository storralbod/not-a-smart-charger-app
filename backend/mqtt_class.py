import asyncio
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from .db import pool


def seconds_until_next_hour():
    now = datetime.now()
    next_hour = (now + timedelta(hours=1)).replace(
        minute=0, second=0, microsecond=0
    )
    return (next_hour - now).total_seconds()

clients = set()
async def broadcast_power(power):
    message = {
        "power": power,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    for ws in clients:
        await ws.send_text(json.dumps(message))

def save_power_reading(device_id, power, timestamp):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO power_readings (timestamp, device_id, power)
                VALUES (%s, %s, %s)
                """,
                (timestamp, device_id, power)
            )

class MQTTClass():
    def __init__(self, device_id:str= "", broker:str="", port:int=None, loop:str=""):
        self.device_id = device_id
        self.broker = broker
        self.port = port
        self.loop = loop

        self.switch_command_topic = f"{device_id}/command/switch:0"
        self.switch_status_topic = f"{device_id}/status/switch:0"
        self.event_topic = f"{device_id}/events/rpc"
        self.status_topic = f"{device_id}/status"
        self.command_topic = f"{device_id}/command"

        self.client = mqtt.Client(client_id=f"{device_id} MQTT Client", userdata={"loop": loop})
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

        self.last_status = None
        self.last_power = None
        self.switch_on = False
        self.connected = False

        self.switch_map = {True: "on", False: "off"}


    def connect(self):
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()

    def on_connect(self, client, userdata, flags, rc):
        print("Subscribing to MQTT broker")
        client.subscribe(self.switch_status_topic)
        client.subscribe(self.event_topic)
        client.subscribe(self.status_topic)

        self.client.publish(self.command_topic, "status_update")

    def check_online_status(self):
        print('Checking if device connected:')

        start_time = time.time()
        timeout = 5
        while self.connected is False and (time.time() - start_time) < timeout:
            time.sleep(1)

        if not self.connected:
            print('Device not connected')
            


    def on_message(self, client, userdata, msg):
        payload = json.loads(msg.payload.decode())

        if msg.topic == self.switch_status_topic:
            self.last_status = payload
            self.switch_on = payload.get("output", self.switch_on)
            if 'apower' in payload.keys():
                self.last_power = payload.get("apower", 0)
                asyncio.run_coroutine_threadsafe(broadcast_power(self.last_power), userdata['loop'])
                save_power_reading(
                    device_id=self.device_id,
                    power=self.last_power,
                    timestamp = datetime.now(timezone.utc).isoformat()
                )
                #print("Power consumed: ",self.last_power)

        elif msg.topic == self.event_topic:
            try:
                params = payload["params"]["switch:0"]
                #if "apower" in params:
                if "apower" in params: #and datetime.now().second>57: # comment and uncomment above if want data every second and not minute
                    self.last_power = params["apower"]
                    asyncio.run_coroutine_threadsafe(broadcast_power(self.last_power), userdata['loop'])
                    save_power_reading(
                        device_id=self.device_id,
                        power=self.last_power,
                        timestamp = datetime.now(timezone.utc).isoformat()
                    )
                    #print("Power consumed: ",self.last_power)
            except KeyError:
                pass

        elif msg.topic == self.status_topic:
            if payload["mqtt"]["connected"] == True:
                self.connected = True
                print('Device plugged and connected')
        

    def set_switch(self, state: bool):
        print(f"Setting switch {self.switch_map[state]}")
        self.client.publish(self.switch_command_topic , self.switch_map[state])

    def confirm_switch_state(self, state):
        while True:
            try:
                self.client.publish(self.switch_command_topic , "status_update")
                if self.switch_on == state:
                    print("Confirmed")
                    break
                else:
                    print("Not confirmed")
                    self.set_switch(state)                    

            except:
                self.set_switch(state) 

            time.sleep(1)


    @staticmethod
    def hour_match(hours):
        spain_tz = ZoneInfo("Europe/Madrid")
        spain_time_now = datetime.now(spain_tz)
        return spain_time_now.hour in hours


    def run_charging_schedule(self, hours, end_charge_hour):
        print("Charging hours:", hours)
        spain_tz = ZoneInfo("Europe/Madrid")
        spain_time_now = datetime.now(spain_tz)
        end_date = spain_time_now.replace(hour=end_charge_hour, minute=0, second=0, microsecond=0)
        print("charging func spain time:", spain_time_now)
        print("charging fun end time:", end_date)
        if end_date <= spain_time_now:
            end_date += timedelta(days=1)
            
        save_power_reading(
            device_id=self.device_id,
            power=0,
            timestamp = spain_time_now.astimezone(timezone.utc).isoformat()
        )
        
        while spain_time_now < end_date: # change to while datetime.now() < user_inputted_end_hour
            spain_time_now = datetime.now(spain_tz)
            print("INSIDE WHILE LOOP")
            if self.hour_match(hours):
                self.set_switch(True)
                self.confirm_switch_state(True)
                while self.hour_match(hours) and spain_time_now < end_date:
                    self.client.publish(self.switch_command_topic, "status_update")
                    time.sleep(1)
            else:
                self.set_switch(False)
                self.confirm_switch_state(False)

                # saving 0 power value when charging hour ends to ensure it is plotted correctly (if last value is for ex. 40W then it will leave that point as last which looks like charging didn't end)
                save_power_reading(
                    device_id=self.device_id,
                    power=0,
                    timestamp = spain_time_now.astimezone(timezone.utc).isoformat()
                )
                
                sleep_seconds = seconds_until_next_hour()
                print("Minutes until next hourr: ", sleep_seconds/60)
                time.sleep(sleep_seconds)

        self.set_switch(False)
        self.confirm_switch_state(False)
        self.client.loop_stop()

        # saving 0 power value when charging session ends to ensure it is plotted correctly (if last value is for ex. 40W then it will leave that point as last which looks like charging didn't end)
        save_power_reading(
            device_id=self.device_id,
            power=0,
            timestamp = spain_time_now.astimezone(timezone.utc).isoformat()
        )

    def force_stop_charging(self):

        self.set_switch(True)
        self.confirm_switch_state(True)
        self.client.loop_stop()

        return self.switch_on
        

    
