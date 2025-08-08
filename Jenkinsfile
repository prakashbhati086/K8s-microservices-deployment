pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'prakashbhati086'
        KUBE_CONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config'
    }

    stages {
        stage('Checkout Code & Get Commit') {
            steps {
                git branch: 'main', url: 'https://github.com/prakashbhati086/MicroAuthX.git'
                script {
                    def commitHash = bat(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.COMMIT_HASH = commitHash
                    echo "Commit hash: ${env.COMMIT_HASH}"
                }
            }
        }

        stage('Build & Push Auth Service') {
            steps {
                dir('auth-service') {
                    script {
                        bat """
                        docker build -t %DOCKER_HUB_USER%/microauthx-auth-service:%COMMIT_HASH% -t %DOCKER_HUB_USER%/microauthx-auth-service:latest .
                        docker push %DOCKER_HUB_USER%/microauthx-auth-service:%COMMIT_HASH%
                        docker push %DOCKER_HUB_USER%/microauthx-auth-service:latest
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
                        docker build -t %DOCKER_HUB_USER%/microauthx-frontend-service:%COMMIT_HASH% -t %DOCKER_HUB_USER%/microauthx-frontend-service:latest .
                        docker push %DOCKER_HUB_USER%/microauthx-frontend-service:%COMMIT_HASH%
                        docker push %DOCKER_HUB_USER%/microauthx-frontend-service:latest
                        """
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    bat """
                    kubectl --kubeconfig="%KUBE_CONFIG_PATH%" set image deployment/auth-service auth-service=%DOCKER_HUB_USER%/microauthx-auth-service:%COMMIT_HASH% --namespace=default
                    kubectl --kubeconfig="%KUBE_CONFIG_PATH%" set image deployment/frontend-service frontend-service=%DOCKER_HUB_USER%/microauthx-frontend-service:%COMMIT_HASH% --namespace=default
                    """
                }
            }
        }
    }

    post {
        failure {
            echo "❌ Build, push, or deploy failed. Check console logs."
        }
        success {
            echo "✅ Successfully deployed to Kubernetes."
        }
    }
}
