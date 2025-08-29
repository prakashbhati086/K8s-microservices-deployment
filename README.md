Project Overview
K8s-microservices-deployment is a production-ready microservices authentication system that demonstrates modern DevOps practices. This project showcases:

Microservices Architecture with separate frontend and backend services

Kubernetes Orchestration with proper service discovery and scaling

MongoDB Integration with persistent storage

Professional Monitoring using Prometheus and Grafana

Automated CI/CD with Jenkins pipeline
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Service   │    │  Auth Service   │    │    MongoDB      │
│   (Frontend)    │───▶│   (Backend)     │───▶│   (Database)    │
│   Port: 4000    │    │   Port: 3000    │    │   Port: 27017   │
│   NodePort:30081│    │   ClusterIP     │    │   ClusterIP     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                      ┌─────────────────┐
                      │   Monitoring    │
                      │ Prometheus +    │
                      │   Grafana       │
                      │ NodePort:30091  │
                      └─────────────────┘

<img width="547" height="885" alt="image" src="https://github.com/user-attachments/assets/d7539a9c-29a3-42c4-a61f-23391ca91059" />

<img width="551" height="755" alt="image" src="https://github.com/user-attachments/assets/29490c3e-8ece-4d21-8431-cb77c4ea3f82" />

<img width="555" height="758" alt="image" src="https://github.com/user-attachments/assets/84131e29-a9fd-47d1-b21c-1c2041c71f44" />
<img width="539" height="750" alt="image" src="https://github.com/user-attachments/assets/66860e08-7c30-4f39-a2a7-520ca5ba63c2" />

<img width="575" height="694" alt="image" src="https://github.com/user-attachments/assets/41fb7284-ed47-4521-8367-4a2d132da091" />

<img width="543" height="878" alt="image" src="https://github.com/user-attachments/assets/b7fff533-8aa4-43b0-b4fb-045943f29520" />

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
<img width="1121" height="871" alt="image" src="https://github.com/user-attachments/assets/99fc5aef-bf3f-4f3f-8bee-b06685c7a0ea" />

<img width="1231" height="914" alt="image" src="https://github.com/user-attachments/assets/e83b4783-7780-4f64-988a-74ce4a97dd59" />

<img width="1920" height="852" alt="image" src="https://github.com/user-attachments/assets/29dab7d8-6b7d-4ccd-b772-714ba0e5c8f5" />

