import os
import asyncio
import boto3
from botocore.exceptions import ClientError
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def cleanup_database():
    """
    Cleans up the progress_photos collection to free up MongoDB disk space,
    AND deletes the corresponding objects from S3.
    Run this locally after setting your env vars in a .env file.
    """
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'fat2fitxpress')
    aws_region = os.environ.get('AWS_REGION', 'us-east-1')
    aws_bucket = os.environ.get('AWS_S3_BUCKET_NAME', '')

    if not mongo_url:
        print("Error: MONGO_URL not found in environment.")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"Connecting to {db_name}...")

    # 1. Count current photos
    count = await db.progress_photos.count_documents({})
    print(f"Current progress photos in MongoDB: {count}")

    if count == 0:
        print("Nothing to clean up in MongoDB.")
    else:
        # 2. Collect all S3 URLs before deleting MongoDB docs
        photos = await db.progress_photos.find({}, {"_id": 0, "photo_url": 1}).to_list(None)
        s3_urls = [p["photo_url"] for p in photos if p.get("photo_url")]

        # 3. Delete all MongoDB docs
        print("Deleting all progress photo documents from MongoDB...")
        result = await db.progress_photos.delete_many({})
        print(f"Deleted {result.deleted_count} documents from MongoDB.")

        # 4. Delete corresponding S3 objects
        if s3_urls and aws_bucket:
            print(f"Deleting {len(s3_urls)} objects from S3 bucket '{aws_bucket}'...")
            s3 = boto3.client(
                's3',
                region_name=aws_region,
                aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            )
            prefix = f"https://{aws_bucket}.s3.{aws_region}.amazonaws.com/"
            deleted = 0
            for url in s3_urls:
                try:
                    if url.startswith(prefix):
                        key = url[len(prefix):]
                        s3.delete_object(Bucket=aws_bucket, Key=key)
                        deleted += 1
                except ClientError as e:
                    print(f"  Warning: failed to delete {url}: {e}")
            print(f"Deleted {deleted} objects from S3.")
        elif not aws_bucket:
            print("AWS_S3_BUCKET_NAME not set — skipping S3 cleanup.")
        else:
            print("No S3 URLs found in documents (likely old base64-only records). Nothing to clean from S3.")

    client.close()
    print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup_database())
