import random
import string
from datetime import datetime


def generate_order_number() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"MPC-{timestamp}-{suffix}"
