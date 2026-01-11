import os
from dotenv import load_dotenv

load_dotenv()  # reads .env

MQTT_SERVER = os.getenv("MQTT_SERVER")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
SHELLY_ID = os.getenv("SHELLY_ID")

ENTSOE_API_KEY = os.getenv("ENTSOE_API_KEY")
ESIOS_API_KEY = os.getenv("ESIOS_API_KEY")