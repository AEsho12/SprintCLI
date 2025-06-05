# spring-cli-create

A CLI tool to quickly create Spring Boot applications with a modern project structure.

## Installation

```bash
npm install -g spring-cli-create
```

Or use it directly with npx:
```bash
npx spring-cli-create
```

## Usage

```bash
spring-cli-create
```

This will start an interactive process to create a new Spring Boot application. Follow the prompts to:
- Choose your project name
- Select dependencies
- Configure your application

## Running Your Application

After creating your project:

1. Navigate to your project directory:
```bash
cd your-project-name
```

2. Run your Spring Boot application:
```bash
./mvnw spring-boot:run
```

## Features

- Interactive project creation
- Modern Spring Boot project structure
- Dependency management
- Ready-to-use configuration
- Automatic Maven Wrapper setup

## Requirements

- Node.js 14 or higher
- Java 17 or higher
- Maven or Gradle

## License

MIT