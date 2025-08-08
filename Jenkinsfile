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
                    // Use powershell for better variable handling on Windows
                    env.COMMIT_HASH = powershell(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    echo "Commit hash: ${env.COMMIT_HASH}"
                }
            }
        }

        stage('Build & Push Auth Service') {
            steps {
                dir('auth-service') {
                    script {
                        bat """
                            docker build -t ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH} .
                            docker login -u ${DOCKERHUB_USER} -p ${DOCKERHUB_CREDENTIALS_PSW}
                            docker push ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
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
                            docker build -t ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH} .
                            docker login -u ${DOCKERHUB_USER} -p ${DOCKERHUB_CREDENTIALS_PSW}
                            docker push ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                        """
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Update deployment files with new image tags
                    bat """
                        powershell -Command "(Get-Content auth-service/k8s/deployment.yml) -replace 'image: ${DOCKERHUB_USER}/microauthx-auth-service:.*', 'image: ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}' | Set-Content auth-service/k8s/deployment.yml"
                        powershell -Command "(Get-Content frontend-service/k8s/deployment.yml) -replace 'image: ${DOCKERHUB_USER}/microauthx-frontend-service:.*', 'image: ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}' | Set-Content frontend-service/k8s/deployment.yml"
                    """
                    
                    bat """
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/deployment.yml
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/service.yml

                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/deployment.yml
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/service.yml

                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/deployment.yml
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/service.yml
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/pvc.yml
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/mongo-secret.yml
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Build, push, and deploy completed successfully!"
        }
        failure {
            echo "❌ Build, push, or deploy failed. Check console logs."
        }
    }
}
