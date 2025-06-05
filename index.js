#!/usr/bin/env node

const inquirer = require("inquirer");
const autocomplete = require("inquirer-autocomplete-prompt");
const fuzzaldrin = require("fuzzaldrin");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");
const os = require("os");

inquirer.registerPrompt("autocomplete", autocomplete);

const allDependencies = [
  { name: "spring-boot-starter-web", message: "Web, for building REST APIs" },
  {
    name: "spring-boot-starter-security",
    message: "Security, authentication/authorization",
  },
  {
    name: "spring-boot-starter-data-jpa",
    message: "JPA, for ORM/database access",
  },
  { name: "mysql-connector-java", message: "JDBC driver for MySQL" },
  { name: "spring-boot-devtools", message: "Dev tools with auto reload" },
  {
    name: "spring-boot-starter-actuator",
    message: "Monitoring and management",
  },
  { name: "lombok", message: "Lombok, for reducing boilerplate" },
];

async function searchDependencies(_, input = "") {
  return allDependencies
    .filter(
      (dep) =>
        fuzzaldrin.filter([dep.name + " - " + dep.message], input).length > 0,
    )
    .map((dep) => ({ name: `${dep.name} (${dep.message})`, value: dep.name }));
}

(async () => {
  console.log("🚀 Welcome to create-spring-app CLI");

  const { projectName } = await inquirer.prompt({
    name: "projectName",
    message: "Enter project name:",
    default: "my-spring-app",
  });

  const { dependencies } = await inquirer.prompt({
    type: "autocomplete",
    name: "dependencies",
    message: "Add dependencies (search and select multiple):",
    source: searchDependencies,
    pageSize: 8,
    loop: false,
    multiple: true,
  });

  console.log("\n✅ Creating Spring Boot project...");
  const baseUrl = "https://start.spring.io/starter.zip";
  const params = new URLSearchParams({
    type: "maven-project",
    language: "java",
    bootVersion: "3.2.5",
    baseDir: projectName,
    groupId: "com.example",
    artifactId: projectName,
    name: projectName,
    dependencies: dependencies.join(","),
  });

  const response = await axios({
    method: "GET",
    url: `${baseUrl}?${params.toString()}`,
    responseType: "stream",
  });

  const zipPath = path.join(os.tmpdir(), `${projectName}.zip`);
  const outputPath = path.resolve(process.cwd(), projectName);

  const writer = fs.createWriteStream(zipPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: outputPath }))
    .on("close", () => {
      console.log(`\n✅ Project created at: ./${projectName}`);
      console.log(`👉 cd ${projectName} && ./mvnw spring-boot:run`);
    });
})();
