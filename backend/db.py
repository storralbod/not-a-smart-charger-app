from psycopg_pool import ConnectionPool
from .config import DB_URL, SESSIONS_DB_URL

pool = ConnectionPool(
    #conninfo="postgresql://postgres:postgres@localhost:5432/shelly", #ensure db url is correct when deploying
    conninfo = DB_URL,
    min_size=1,
    max_size=10,
    open=True
)
