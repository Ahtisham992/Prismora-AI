import asyncio
import httpx
import os

async def check():
    url = "https://zylalabs.com/api/1285/youtube+download+and+info+api/12850/download"
    api_key = "12850|yWSAX4kHJYwGUqSc9jEAuML97cGVxoWOr9jA8Aue"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    params = {"id": "xLqUXIwPGUo"}
    
    print("Fetching...", url)
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, params=params)
        print("Status:", resp.status_code)
        try:
            print("JSON:")
            print(resp.json())
        except Exception as e:
            print("Text:")
            print(resp.text)

if __name__ == "__main__":
    asyncio.run(check())
