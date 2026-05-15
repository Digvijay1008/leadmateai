import asyncio

async def test_say():
    class DummySpeechHandle:
        def __await__(self):
            yield

    try:
        h = DummySpeechHandle()
        await h
        print("Awaited successfully")
    except Exception as e:
        print(f"Failed to await: {e}")

asyncio.run(test_say())
