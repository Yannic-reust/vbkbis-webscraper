# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy entire project
COPY . .

# Install cron
RUN apt-get update && apt-get install -y cron

# Copy crontab file and set permissions
COPY crontab /etc/cron.d/scraper-cron
RUN chmod 0644 /etc/cron.d/scraper-cron

# Apply cron job
RUN crontab /etc/cron.d/scraper-cron

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# Start cron in the foreground
CMD cron && tail -f /var/log/cron.log