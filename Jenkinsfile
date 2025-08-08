pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')
        DOCKERHUB_USER = 'prakashbhati086'
        KUBECONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config'
    }

    stages {
        stage('Checkout Code & Get Commit') {
            steps {
                checkout scm
                script {
                    env.COMMIT_HASH = powershell(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    echo "Commit hash: ${env.COMMIT_HASH}"
                }
            }
        }

        stage('Verify Credentials') {
            steps {
                script {
                    bat """
                        echo "Testing DockerHub credentials..."
                        docker login -u ${DOCKERHUB_CREDENTIALS_USR} -p ${DOCKERHUB_CREDENTIALS_PSW}
                        echo "✅ DockerHub login successful"
                    """
                }
            }
        }

        stage('Build & Push Auth Service') {
            steps {
                dir('auth-service') {
                    script {
                        bat """
                            echo "Building auth service..."
                            docker build -t ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-auth-service:latest .
                            echo "Pushing auth service..."
                            docker push ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
                            docker push ${DOCKERHUB_USER}/microauthx-auth-service:latest
                        """
                    }
                }
            }
        }

        stage('Build & Push Frontend Service') {
            steps {
                dir('frontend-service') {
                    script {
                        bat """
                            echo "Building frontend service..."
                            docker build -t ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-frontend-service:latest .
                            echo "Pushing frontend service..."
                            docker push ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                            docker push ${DOCKERHUB_USER}/microauthx-frontend-service:latest
                        """
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    bat """
                        echo "Applying MongoDB resources first..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/pvc.yml
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/deployment.yml
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/service.yml
                        
                        echo "Waiting for MongoDB to be ready..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" wait --for=condition=Ready pod -l app=mongo --timeout=300s
                        
                        echo "Deploying backend services..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/
                        
                        echo "Forcing deployment restart to pull latest images..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/frontend-service
                        
                        echo "Waiting for deployments to complete..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/auth-service --timeout=300s
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/frontend-service --timeout=300s
                        
                        echo "✅ Deployment completed successfully"
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully!"
            echo "Services available at:"
            echo "Frontend: http://localhost:30080"
            echo "Images: ${DOCKERHUB_USER}/microauthx-auth-service:latest, ${DOCKERHUB_USER}/microauthx-frontend-service:latest"
        }
        failure {
            echo "❌ Pipeline failed. Check the logs above for details."
        }
        always {
            node {
                script {
                    try {
                        bat "docker logout"
                        echo "Docker logout completed"
                    } catch (Exception e) {
                        echo "Docker logout failed: ${e.getMessage()}"
                    }
                }
            }
        }
    }
}
