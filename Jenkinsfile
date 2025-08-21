pipeline {
  agent any
  environment {
    DOCKERHUB = 'prakashbhati086'
    DOCKER_CREDS = credentials('docker-credentials')
    KUBECONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config' // adjust if Linux
    COMMIT = "${env.BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Docker Login') {
      steps {
        bat """
          docker login -u %DOCKER_CREDS_USR% -p %DOCKER_CREDS_PSW%
        """
      }
    }
    stage('Build & Push Images') {
      parallel {
        stage('auth-service') {
          steps {
            dir('auth-service') {
              bat """
                docker build -t %DOCKERHUB%/micro-simple-auth:%COMMIT% -t %DOCKERHUB%/micro-simple-auth:latest .
                docker push %DOCKERHUB%/micro-simple-auth:%COMMIT%
                docker push %DOCKERHUB%/micro-simple-auth:latest
              """
            }
          }
        }
        stage('web-service') {
          steps {
            dir('web-service') {
              bat """
                docker build -t %DOCKERHUB%/micro-simple-web:%COMMIT% -t %DOCKERHUB%/micro-simple-web:latest .
                docker push %DOCKERHUB%/micro-simple-web:%COMMIT%
                docker push %DOCKERHUB%/micro-simple-web:latest
              """
            }
          }
        }
      }
    }
    stage('Deploy to Kubernetes') {
      steps {
        bat """
          kubectl --kubeconfig="%KUBECONFIG_PATH%" apply -f auth-service/k8s/
          kubectl --kubeconfig="%KUBECONFIG_PATH%" set image deployment/auth-service auth-service=%DOCKERHUB%/micro-simple-auth:%COMMIT%

          kubectl --kubeconfig="%KUBECONFIG_PATH%" apply -f web-service/k8s/
          kubectl --kubeconfig="%KUBECONFIG_PATH%" set image deployment/web-service web-service=%DOCKERHUB%/micro-simple-web:%COMMIT%

          kubectl --kubeconfig="%KUBECONFIG_PATH%" rollout status deployment/auth-service --timeout=300s
          kubectl --kubeconfig="%KUBECONFIG_PATH%" rollout status deployment/web-service --timeout=300s
        """
      }
    }
  }
  post {
    success {
      echo "Deployed. Access web-service at NodePort 30080."
    }
  }
}
