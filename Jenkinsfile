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
                            echo "Pushing auth service with commit hash..."
                            docker push ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
                            echo "Pushing auth service with latest tag..."
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
                            echo "Pushing frontend service with commit hash..."
                            docker push ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                            echo "Pushing frontend service with latest tag..."
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
                        echo "Deploying to Kubernetes with latest images..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/auth-service auth-service=${DOCKERHUB_USER}/microauthx-auth-service:latest
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/frontend-service frontend-service=${DOCKERHUB_USER}/microauthx-frontend-service:latest
                        
                        echo "Applying all Kubernetes manifests..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/
                        
                        echo "Restarting deployments to pull latest images..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/frontend-service
                        
                        echo "✅ Deployment completed"
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully!"
            echo "Images pushed with latest tag: ${DOCKERHUB_USER}/microauthx-auth-service:latest, ${DOCKERHUB_USER}/microauthx-frontend-service:latest"
        }
        failure {
            echo "❌ Pipeline failed. Check the logs above for details."
        }
        always {
            bat "docker logout"
        }
    }
}
