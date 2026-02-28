import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def cleanup_database():
    """
    Cleans up the progress_photos collection to free up space.
    Run this locally after setting your MONGO_URL in a .env file.
    """
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'fat2fitxpress')
    
    if not mongo_url:
        print("Error: MONGO_URL not found in environment.")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connecting to {db_name}...")
    
    # 1. Count current photos
    count = await db.progress_photos.count_documents({})
    print(f"Current progress photos: {count}")
    
    if count == 0:
        print("Nothing to clean up.")
        return

    # 2. Ask user for confirmation (simulated)
    # In a real script we would use input(), but here we will just provide the logic
    # We'll delete ALL progress photos to free up the most space
    print("Deleting all progress photos to free up disk space...")
    result = await db.progress_photos.delete_many({})
    print(f"Deleted {result.deleted_count} documents.")

    # 3. Compact database (only works on some MongoDB versions/configurations)
    # Railway's MongoDB might not allow this directly, but clearing data helps.
    
    client.close()
    print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup_database())
