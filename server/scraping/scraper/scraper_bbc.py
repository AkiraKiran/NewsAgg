from scrape import NewsOrchestrator
import os

SOURCES_BBC = {
    "Sport": ["https://www.bbc.com/sport"],
    "Health": ["https://www.bbc.com/future"],
    "Business": ["https://www.bbc.com/business"],
    "World": ["https://www.bbc.com/news/world"],
    "Politics": ["https://www.bbc.com/news/politics"],
    "Entertainment": ["https://www.bbc.com/arts"],
    "Science": ["https://www.bbc.com/technology"],
    "Travel": ["https://www.bbc.com/travel"]
}

if __name__ == "__main__":
    HF_TOKEN = os.getenv("HF_TOKEN")
    bot = NewsOrchestrator(SOURCES_BBC, "BBC", HF_TOKEN)
    bot.run()