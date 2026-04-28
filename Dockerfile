# ============================================================
# VSST Dockerfile
# Uses Eclipse Temurin Java 21 (official, free, production-grade)
# ============================================================

# Stage 1: Build the JAR using Maven
FROM eclipse-temurin:21-jdk-alpine AS builder

# Set working directory inside container
WORKDIR /app

# Copy Maven wrapper and pom.xml first (for layer caching)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x ./mvnw

# Download all dependencies first (cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build the JAR, skip tests (tests need DB connection)
RUN ./mvnw clean package -DskipTests -B

# ============================================================
# Stage 2: Run the JAR (smaller image, no build tools)
# ============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy only the built JAR from Stage 1
COPY --from=builder /app/target/vsst.jar app.jar

# Expose port 9090 (must match server.port)
EXPOSE 9090

# Start the application with production profile
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]