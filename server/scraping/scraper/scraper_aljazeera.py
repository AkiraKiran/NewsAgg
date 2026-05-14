from scrape import NewsOrchestrator
import os

SOURCES_ALJAZEERA = {
    "Sport": ["https://www.aljazeera.com/sports/"],
    "Health": ["https://www.aljazeera.com/tag/health/"],
    "Business": ["https://www.aljazeera.com/economy/"],
    "World": ["https://www.aljazeera.com/news/"],
    "Science": ["https://www.aljazeera.com/tag/science-and-technology/"]
    # Al Jazeera does not have native "Politics", "Travel", "Entertainment" standard categories in English right now
}

if __name__ == "__main__":
    HF_TOKEN = os.getenv("HF_TOKEN")
    bot = NewsOrchestrator(SOURCES_ALJAZEERA, "AlJazeera", HF_TOKEN)
    bot.run()