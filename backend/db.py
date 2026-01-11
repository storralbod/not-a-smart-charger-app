from psycopg_pool import ConnectionPool

pool = ConnectionPool(
    conninfo="postgresql://postgres:postgres@localhost:5432/shelly", #ensure db url is correct when deploying
    min_size=1,
    max_size=10,
    open=True
)

