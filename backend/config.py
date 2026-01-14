import os
from dotenv import load_dotenv

load_dotenv()  # reads .env

MQTT_SERVER = os.getenv("MQTT_SERVER")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
SHELLY_ID = os.getenv("SHELLY_ID")

ENTSOE_API_KEY = os.getenv("ENTSOE_API_KEY")
ESIOS_API_KEY = os.getenv("ESIOS_API_KEY")

DB_URL = os.getenv("DB_URL")
SESSIONS_DB_URL = os.getenv("SESSIONS_DB_URL")

APP_USERNAME = os.getenv("APP_USERNAME")
APP_PASSWORD = os.getenv("APP_PASSWORD")

JWT_SECRET = os.getenv("JWT_SECRET")

