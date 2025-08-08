pipeline {
    agent any

    environment {
         DOCKER_HUB_CREDENTIALS = 'docker-credentials'
        DOCKERHUB_USER = 'prakashbhati086'
        KUBECONFIG_PATH = "C:\\Users\\Prakash Bhati\\.kube\\config" // change this to your kubeconfig path
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/prakashbhati086/MicroAuthX.git'
            }
        }

        stage('Build & Push Auth Service') {
            steps {
                dir('auth-service') {
                    script {
                        def commitHash = bat(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        bat "docker build -t ${DOCKERHUB_USER}/microauthx-auth-service:${BUILD_NUMBER}-${commitHash} ."
                        bat "docker push ${DOCKERHUB_USER}/microauthx-auth-service:${BUILD_NUMBER}-${commitHash}"
                    }
                }
            }
        }

        stage('Build & Push Frontend Service') {
            steps {
                dir('frontend-service') {
                    script {
                        def commitHash = bat(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        bat "docker build -t ${DOCKERHUB_USER}/microauthx-frontend-service:${BUILD_NUMBER}-${commitHash} ."
                        bat "docker push ${DOCKERHUB_USER}/microauthx-frontend-service:${BUILD_NUMBER}-${commitHash}"
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Make sure to wrap the kubeconfig path in quotes for Windows
                    bat "kubectl --kubeconfig=\"${KUBECONFIG_PATH}\" apply -f auth-service/k8s"
                    bat "kubectl --kubeconfig=\"${KUBECONFIG_PATH}\" apply -f frontend-service/k8s"
                    bat "kubectl --kubeconfig=\"${KUBECONFIG_PATH}\" apply -f mongo-service/k8s"
                }
            }
        }
    }

    post {
        failure {
            echo '❌ Build, push, or deploy failed.'
        }
        success {
            echo '✅ Deployment successful!'
        }
    }
}
