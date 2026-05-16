import requests
import time
import json

def test_zyla_polling():
    # 1. Start the download
    url = "https://zylalabs.com/api/11016/youtube+download+and+info+api/20761/download"
    api_key = "12850|yWSAX4kHJYwGUqSc9jEAuML97cGVxoWOr9jA8Aue"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    # Let's test grabbing an mp3 
    params = {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "format": "mp3"
    }

    print("POST to Zyla...")
    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code != 200:
        print("Failed to start:", resp.status_code, resp.text)
        return
        
    data = resp.json()
    print("Initial Response:", json.dumps(data, indent=2))
    
    if "progress_url" not in data:
        print("No progress url found. Cannot track.")
        return
        
    progress_url = data["progress_url"]
    
    # Wait for the file to be ready
    print("\nPolling progress URL...")
    for _ in range(30):
        try:
            p_resp = requests.get(progress_url)
            p_data = p_resp.json()
            print("Progress update:", json.dumps(p_data, indent=2))
            
            # Guesses based on standard Async APIs:
            if p_data.get("status") in ["completed", "done", "success", 100]:
                 print("\nSUCCESS! Found download link:")
                 break
            if "download_url" in p_data or "url" in p_data and "status" not in p_data:
                 print("\nLink found dynamically:")
                 break
                 
        except Exception as e:
            print("Poll error:", e)
            
        time.sleep(2)

test_zyla_polling()
