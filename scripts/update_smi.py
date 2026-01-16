import json
import os
import time
from datetime import datetime
from urllib.parse import urlencode

import requests

FMP_BASE = "https://financialmodelingprep.com/stable"


def fmp_get(path: str, params: dict):
    url = f"{FMP_BASE}/{path}"
    qs = urlencode(params)
    r = requests.get(f"{url}?{qs}", timeout=30)
    r.raise_for_status()
    return r.json()


def to_fmp_symbol(six_symbol: str) -> str:
    # FMP uses SIX symbols often as <TICKER>.SW (Yahoo-style).
    return f"{six_symbol}.SW"


def pick_latest_annual_cashflow(symbol: str, api_key: str) -> dict | None:
    data = fmp_get("cash-flow-statement", {"symbol": symbol, "limit": 1, "apikey": api_key})
    if isinstance(data, list) and data:
        return data[0]
    return None


def pick_latest_annual_balance_sheet(symbol: str, api_key: str) -> dict | None:
    data = fmp_get("balance-sheet-statement", {"symbol": symbol, "limit": 1, "apikey": api_key})
    if isinstance(data, list) and data:
        return data[0]
    return None


def pick_profile(symbol: str, api_key: str) -> dict | None:
    data = fmp_get("profile", {"symbol": symbol, "apikey": api_key})
    if isinstance(data, list) and data:
        return data[0]
    return None


def safe_float(x) -> float:
    try:
        if x is None:
            return 0.0
        return float(x)
    except Exception:
        return 0.0


def compute_net_cash(balance: dict) -> float:
    cash = max(
        safe_float(balance.get("cashAndCashEquivalents")),
        safe_float(balance.get("cashAndShortTermInvestments")),
        safe_float(balance.get("cashAndCashEquivalentsAtCarryingValue")),
        0.0,
    )
    debt = max(
        safe_float(balance.get("totalDebt")),
        safe_float(balance.get("shortTermDebt")) + safe_float(balance.get("longTermDebt")),
        safe_float(balance.get("shortTermDebt")) + safe_float(balance.get("longTermDebtNoncurrent")),
        0.0,
    )
    return cash - debt


def compute_fcf(cashflow: dict) -> float:
    fcf = safe_float(cashflow.get("freeCashFlow"))
    if fcf != 0.0:
        return fcf
    ocf = safe_float(cashflow.get("netCashProvidedByOperatingActivities"))
    capex = safe_float(cashflow.get("capitalExpenditure"))
    # capex is often negative; ocf - capex handles both signs.
    return ocf - capex


def compute_shares(profile: dict) -> float:
    return max(safe_float(profile.get("sharesOutstanding")), 0.0)


def main():
    api_key = os.environ.get("FMP_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Missing FMP_API_KEY (set it as a GitHub Actions secret).")

    with open("smi.json", "r", encoding="utf-8") as f:
        smi = json.load(f)

    updated = 0
    failures = []

    for item in smi:
        six = item.get("symbol", "").strip()
        if not six:
            continue

        fmp_symbol = to_fmp_symbol(six)

        try:
            cashflow = pick_latest_annual_cashflow(fmp_symbol, api_key)
            balance = pick_latest_annual_balance_sheet(fmp_symbol, api_key)
            profile = pick_profile(fmp_symbol, api_key)

            if not cashflow or not balance:
                raise ValueError("Missing cashflow or balance data")

            item["fcf"] = round(compute_fcf(cashflow), 2)
            item["netCash"] = round(compute_net_cash(balance), 2)
            if profile:
                item["shares"] = round(compute_shares(profile), 2)

            item["fmpSymbol"] = fmp_symbol

            updated += 1
            time.sleep(0.25)
        except Exception as e:
            failures.append({"symbol": six, "fmpSymbol": fmp_symbol, "error": str(e)})

    with open("smi.json", "w", encoding="utf-8") as f:
        json.dump(smi, f, ensure_ascii=False, indent=2)

    report = {
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "updated": updated,
        "failures": failures,
    }
    os.makedirs("reports", exist_ok=True)
    with open("reports/last_run.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
