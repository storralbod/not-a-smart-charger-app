from typing import Optional
from asyncio import Task
from .mqtt_class import MQTTClass

class ChargingSession:
    controller: Optional[MQTTClass] = None
    task: Optional[Task] = None

session = ChargingSession()