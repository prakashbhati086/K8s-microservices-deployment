pipeline {
    agent any

    environment {
        DOCKER_HUB_CREDENTIALS = 'docker-credentials'
        IMAGE_AUTH = "prakashbhati086/microauthx-auth-service"
        IMAGE_FRONTEND = "prakashbhati086/microauthx-frontend-service"
        KUBECONFIG_PATH = "C:\\Users\\Prakash Bhati\\.kube\\config" // Change to your actual kubeconfig path
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/prakashbhati086/MicroAuthX.git'
            }
        }

        stage('Build & Push Auth Service') {
            steps {
                dir('auth-service') {
                    script {
                        def commitHash = bat(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        env.IMAGE_TAG = "${env.BUILD_NUMBER}-${commitHash}"
                        bat "docker build -t ${IMAGE_AUTH}:${IMAGE_TAG} ."
                        withCredentials([usernamePassword(credentialsId: "${DOCKER_HUB_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            bat """
                                echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
                                docker push ${IMAGE_AUTH}:${IMAGE_TAG}
                            """
                        }
                    }
                }
            }
        }

        stage('Build & Push Frontend Service') {
            steps {
                dir('frontend-service') {
                    script {
                        def commitHash = bat(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        env.IMAGE_TAG = "${env.BUILD_NUMBER}-${commitHash}"
                        bat "docker build -t ${IMAGE_FRONTEND}:${IMAGE_TAG} ."
                        withCredentials([usernamePassword(credentialsId: "${DOCKER_HUB_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            bat """
                                echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
                                docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}
                            """
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Use kubectl with Windows full path if needed
                    bat "kubectl --kubeconfig=${KUBECONFIG_PATH} set image deployment/auth-service auth-service=${IMAGE_AUTH}:${IMAGE_TAG} -n default"
                    bat "kubectl --kubeconfig=${KUBECONFIG_PATH} set image deployment/frontend-service frontend-service=${IMAGE_FRONTEND}:${IMAGE_TAG} -n default"
                }
            }
        }
    }

    post {
        success {
            echo "✅ Build, push, and deploy completed successfully!"
        }
        failure {
            echo "❌ Build, push, or deploy failed."
        }
    }
}
