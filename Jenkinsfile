pipeline {
    agent any

    options {
        // Prevent automatic SCM checkout by declarative pipeline
        skipDefaultCheckout(true)
    }

    environment {
        // Docker Hub user (your Docker Hub username)
        DOCKERHUB_USER = 'prakashbhati086'

        // Windows kubeconfig path (has space in username)
        KUBECONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config'

        // Credential ID in Jenkins for Docker Hub (create this in Jenkins: username/password)
        DOCKERHUB_CREDS_ID = 'docker-credentials'
    }

    stages {
        stage('Checkout Code & Get Commit') {
            steps {
                // Explicit checkout from your GitHub repo (you asked to include it here)
                git branch: 'main', url: 'https://github.com/prakashbhati086/MicroAuthX.git'

                script {
                    // Get short commit hash and store in env var (Windows-friendly)
                    env.COMMIT_HASH = bat(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    echo "Commit hash: ${env.COMMIT_HASH}"
                }
            }
        }

        stage('Build & Push Auth Service') {
            steps {
                dir('auth-service') {
                    script {
                        // Build image
                        bat "docker build -t %DOCKERHUB_USER%/microauthx-auth-service:%COMMIT_HASH% ."

                        // Login & push using Jenkins credentials
                        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            // Login (Windows)
                            bat 'echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin'
                            // Push
                            bat "docker push %DOCKERHUB_USER%/microauthx-auth-service:%COMMIT_HASH%"
                        }
                    }
                }
            }
        }

        stage('Build & Push Frontend Service') {
            steps {
                dir('frontend-service') {
                    script {
                        // Build image
                        bat "docker build -t %DOCKERHUB_USER%/microauthx-frontend-service:%COMMIT_HASH% ."

                        // Login & push using Jenkins credentials
                        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            bat 'echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin'
                            bat "docker push %DOCKERHUB_USER%/microauthx-frontend-service:%COMMIT_HASH%"
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Apply manifests (ensures resources exist)
                    bat "kubectl --kubeconfig=\"%KUBECONFIG_PATH%\" apply -f mongo-service/k8s/"
                    bat "kubectl --kubeconfig=\"%KUBECONFIG_PATH%\" apply -f auth-service/k8s/"
                    bat "kubectl --kubeconfig=\"%KUBECONFIG_PATH%\" apply -f frontend-service/k8s/"

                    // Update deployment images to the new tag (safe and atomic)
                    // NOTE: container names used here must match the 'name:' defined under containers in your deployment.yml
                    bat "kubectl --kubeconfig=\"%KUBECONFIG_PATH%\" set image deployment/auth-service auth-service=%DOCKERHUB_USER%/microauthx-auth-service:%COMMIT_HASH% --namespace=default"
                    bat "kubectl --kubeconfig=\"%KUBECONFIG_PATH%\" set image deployment/frontend-service frontend=%DOCKERHUB_USER%/microauthx-frontend-service:%COMMIT_HASH% --namespace=default"
                }
            }
        }
    }

    post {
        success {
            echo "✅ Build, push, and deploy completed successfully: ${COMMIT_HASH}"
        }
        failure {
            echo "❌ Build, push, or deploy failed. Check console logs."
        }
    }
}
