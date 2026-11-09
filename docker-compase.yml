services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    # Not published to the host. Only the backend can reach it.

  ai-service:
    build: ./ai-service
    restart: unless-stopped
    environment:
      AI_SERVICE_SECRET: ${AI_SERVICE_SECRET:?Set AI_SERVICE_SECRET in .env}

  backend:
    build: ./backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGO_URI: mongodb://mongo:27017/careerinfinity
      JWT_SECRET: ${JWT_SECRET:?Set JWT_SECRET in .env}
      CLIENT_URL: http://localhost:8080
      AI_SERVICE_URL: http://ai-service:8000
      AI_SERVICE_SECRET: ${AI_SERVICE_SECRET:?Set AI_SERVICE_SECRET in .env}
      USE_SEMANTIC_SCORING: "true"
    depends_on:
      - mongo
      - ai-service
    volumes:
      - backend_storage:/app/storage

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://localhost:5000/api
    restart: unless-stopped
    ports:
      - "8080:80"
    depends_on:
      - backend

volumes:
  mongo_data:
  backend_storage: