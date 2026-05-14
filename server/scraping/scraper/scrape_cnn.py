from scrape import NewsOrchestrator
import os

SOURCES_CNN = {
    "Sport": ["https://edition.cnn.com/sport"],
    "Health": ["https://edition.cnn.com/health"],
    "Business": ["https://edition.cnn.com/business"],
    "World": ["https://edition.cnn.com/world"],
    "Politics": ["https://edition.cnn.com/politics"],
    "Entertainment": ["https://edition.cnn.com/entertainment", "https://edition.cnn.com/style"],
    "Science": ["https://edition.cnn.com/science"],
    "Travel": ["https://edition.cnn.com/travel"]
}

if __name__ == "__main__":
    HF_TOKEN = os.getenv("HF_TOKEN") # Make sure to set your hugging face token!
    bot = NewsOrchestrator(SOURCES_CNN, "CNN", HF_TOKEN)
    bot.run()