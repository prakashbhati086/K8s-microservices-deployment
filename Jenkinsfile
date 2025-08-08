pipeline {
    agent any

    environment {
        DOCKER_HUB_CREDENTIALS = 'docker-credentials'
        DOCKER_USER = ''
        DOCKER_PASS = ''
        AUTH_IMAGE = 'prakashbhati086/microauthx-auth-service'
        FRONTEND_IMAGE = 'prakashbhati086/microauthx-frontend-service'
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/prakashbhati086/MicroAuthX.git'
            }
        }

        stage('Set Docker Credentials') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_HUB_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    script {
                        env.DOCKER_USER = "${DOCKER_USER}"
                        env.DOCKER_PASS = "${DOCKER_PASS}"
                    }
                }
            }
        }

        stage('Build Auth Service Image') {
            steps {
                dir('auth-service') {
                    script {
                        def commitHash = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        def tag = "${env.BUILD_NUMBER}-${commitHash}"
                        env.AUTH_TAG = tag
                        sh "docker build -t ${AUTH_IMAGE}:${tag} ."
                    }
                }
            }
        }

        stage('Build Frontend Service Image') {
            steps {
                dir('frontend-service') {
                    script {
                        def commitHash = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        def tag = "${env.BUILD_NUMBER}-${commitHash}"
                        env.FRONTEND_TAG = tag
                        sh "docker build -t ${FRONTEND_IMAGE}:${tag} ."
                    }
                }
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                script {
                    sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                    sh "docker push ${AUTH_IMAGE}:${AUTH_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:${FRONTEND_TAG}"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh """
                        kubectl set image deployment/auth-service auth-service=${AUTH_IMAGE}:${AUTH_TAG} --namespace=default || true
                        kubectl set image deployment/frontend-service frontend-service=${FRONTEND_IMAGE}:${FRONTEND_TAG} --namespace=default || true
                        kubectl apply -f mongo-service/k8s/
                        kubectl apply -f auth-service/k8s/
                        kubectl apply -f frontend-service/k8s/
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment Successful!"
        }
        failure {
            echo "❌ Deployment Failed!"
        }
    }
}
