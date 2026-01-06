import os
import requests
from typing import List, Dict
from dotenv import load_dotenv
load_dotenv()

SERPER_API_KEY = os.getenv("SERPER_API_KEY")

def search_web(query: str) -> List[Dict[str, str]]:
    """
    Search the web using Serper API
    https://serper.dev/
    """
    if not SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY not set")

    url = "https://google.serper.dev/search"
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "q": query,
        "num": 5
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("organic", []):
            results.append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "url": item.get("link", "")
            })

        return results

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Serper request failed: {e}")

print(search_web("coffee"))