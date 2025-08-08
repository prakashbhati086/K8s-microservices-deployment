FullStack DevOps Deployment
A personal DevOps project demonstrating end-to-end CI/CD workflows using a simple Node.js app, Docker, Jenkins, and Kubernetes.
![image](https://github.com/user-attachments/assets/19be1f61-fdcd-4f22-b1c1-127d5a60f3c2)

🎯 Project Purpose
This project was built to:

Practice and showcase a complete DevOps pipeline.

Automate build, test, and deployment processes.

Learn containerization with Docker and orchestration using Kubernetes.

Implement CI/CD using Jenkins.

Simulate real-world DevOps practices, including:

Microservice deployment

Infrastructure as Code

Version-controlled automation
![image](https://github.com/user-attachments/assets/ac41b18b-f863-494d-880a-6447538e0a66)
![image](https://github.com/user-attachments/assets/57fbb0ed-cfc3-42e8-a1dc-3f5fe99b03be)
![image](https://github.com/user-attachments/assets/5fd3c9c7-eac1-4282-ac6b-f3074e190adb)

Tools & Technologies Used
Category	           Tools
Version          Control	Git, GitHub
CI/CD Pipeline	 Jenkins
Containers	     Docker
Orchestration	   Kubernetes (via Minikube)
Database	       MongoDB (Docker image)
Application      Stack	Node.js (Express), HTML/CSS

DevOps Workflow
1. 🧾 Version Control (Git & GitHub)
Created a Node.js app with login/signup & homepage.

Used Git for version control; hosted on GitHub for integration with Jenkins.

2. 🔁 CI/CD Pipeline (Jenkins)
Jenkins pipeline stages:

Clone GitHub repo

Install dependencies (npm install)

Generate Docker image tag (Git commit hash + build number)

Build & push image to Docker Hub

Windows Issue Solved:

Jenkins on Windows doesn't support shell scripts (sh). Rewrote scripts using bat commands for compatibility.

3. 🐳 Containerization (Docker)
Created a Dockerfile to containerize the app.

Tagged images dynamically per build.

Issue Faced:

Missing dependencies & path errors during builds.

Solution:

Defined correct working directory and resolved using multi-stage tagging in Jenkins.

4. ☸️ Orchestration (Kubernetes with Minikube)
Simulated a Kubernetes cluster using Minikube.

Created Kubernetes YAMLs for:

MongoDB Deployment

Node.js App Deployment

Persistent Volumes

Services (internal & external)

Issue Faced:

Jenkins couldn’t apply kubectl due to missing kubeconfig.

Solution:

Copied Minikube config & certs to Jenkins directory and set correct permissions.

5. 🔄 Automated Deployment
Jenkins automatically:

Updates image tag in nodeapp-deployment.yml

Applies all Kubernetes manifests

Final pipeline achieves CI/CD from code commit to deployment.

✅ Key Learnings
Full CI/CD implementation with Jenkins

Windows/Linux script compatibility in Jenkinsfiles

Docker image tagging and deployment automation

Kubernetes deployment with volumes, services, and secrets

Troubleshooting real-world DevOps pipeline issues

