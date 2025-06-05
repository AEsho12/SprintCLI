#!/usr/bin/env node

import axios from "axios";
import { exec } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import inquirer from "inquirer";
import os from "os";
import path from "path";
import unzipper from "unzipper";
import { promisify } from "util";

const execAsync = promisify(exec);

// Add validation functions
function isValidProjectName(name) {
  // Prevent path traversal and invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  const hasPathTraversal = /\.\./;
  return !invalidChars.test(name) && !hasPathTraversal.test(name);
}

function sanitizeProjectName(name) {
  // Remove any invalid characters and convert to lowercase
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

const DEPENDENCIES = [
  { name: "Spring Web", value: "web" },
  { name: "Spring Security", value: "security" },
  { name: "Spring Data JPA", value: "data-jpa" },
  { name: "PostgreSQL Driver", value: "postgresql" },
  { name: "MariaDB Driver", value: "mariadb" },
  { name: "Lombok", value: "lombok" },
  { name: "Spring Boot DevTools", value: "devtools" },
  { name: "Vaadin", value: "vaadin" },
];

async function selectDependencies() {
  const { dependencies } = await inquirer.prompt({
    type: "checkbox",
    name: "dependencies",
    message: "Select dependencies:",
    choices: DEPENDENCIES,
    validate: (answer) =>
      answer.length < 1 ? "You must choose at least one dependency." : true,
  });
  return dependencies;
}

async function main() {
  try {
    const { projectName: rawProjectName } = await inquirer.prompt({
      name: "projectName",
      message: "Enter project name:",
      default: "my-spring-app",
      validate: (input) => {
        const trimmed = input.trim();
        if (trimmed === "") return "Project name cannot be empty";
        if (!isValidProjectName(trimmed)) {
          return "Project name contains invalid characters. Use only letters, numbers, and hyphens.";
        }
        return true;
      },
    });

    // Sanitize the project name
    const projectName = sanitizeProjectName(rawProjectName);
    if (projectName !== rawProjectName) {
      console.log(`\nℹ️  Project name has been sanitized to: ${projectName}`);
    }

    const dependencies = await selectDependencies();

    console.log("\n📦 Downloading project from Spring Initializr...");

    const baseUrl = "https://start.spring.io/starter.zip";
    const params = new URLSearchParams({
      type: "maven-project",
      language: "java",
      bootVersion: "3.3.0",
      baseDir: projectName,
      groupId: "com.example",
      artifactId: projectName,
      name: projectName,
      javaVersion: "17",
      dependencies: dependencies.join(","),
    });

    const response = await axios({
      method: "GET",
      url: `${baseUrl}?${params.toString()}`,
      responseType: "stream",
    });

    const zipPath = path.join(os.tmpdir(), `${projectName}.zip`);
    const outputPath = path.resolve(process.cwd(), projectName);

    // Ensure output directory does not exist or is empty
    if (fs.existsSync(outputPath)) {
      console.error(
        `❌ Directory "${projectName}" already exists. Please remove it or choose another project name.`,
      );
      process.exit(1);
    }

    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Extract the zip to outputPath
    await fsp.mkdir(outputPath, { recursive: true });

    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: outputPath }))
        .on("close", resolve)
        .on("error", reject);
    });

    // The zip usually contains a folder with projectName inside outputPath,
    // move its contents up to outputPath root then delete that folder.
    const innerFolder = path.join(outputPath, projectName);
    const innerExists = await fsp
      .stat(innerFolder)
      .then(() => true)
      .catch(() => false);

    if (innerExists) {
      const innerFiles = await fsp.readdir(innerFolder);
      for (const file of innerFiles) {
        await fsp.rename(
          path.join(innerFolder, file),
          path.join(outputPath, file),
        );
      }
      await fsp.rmdir(innerFolder);
    }

    // Clean up zip file
    await fsp.unlink(zipPath);

    // Set permissions for Maven Wrapper
    console.log("\n🔧 Setting up Maven Wrapper permissions...");
    try {
      const mvnwPath = path.join(outputPath, 'mvnw');
      // Use fs.chmod instead of exec for better security
      await fsp.chmod(mvnwPath, 0o755); // rwxr-xr-x
      console.log("✅ Maven Wrapper permissions set successfully!");
    } catch (error) {
      console.warn("⚠️ Warning: Could not set Maven Wrapper permissions automatically.");
      console.log("   You may need to run 'chmod +x mvnw' manually.");
    }

    console.log(`\n✅ Project "${projectName}" created successfully!`);
    console.log(`👉 Run:\n   cd ${projectName}\n   ./mvnw spring-boot:run`);
  } catch (err) {
    console.error("❌ Error creating project:", err.message || err);
  }
}

main();
