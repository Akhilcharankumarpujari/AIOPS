pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        skipStagesAfterUnstable()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                echo '=== Stage: Checkout ==='
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                echo '=== Stage: Verify Tools ==='
                bat 'git --version'
                bat 'python --version'
                bat 'node --version'
                bat 'npm --version'
            }
        }

        stage('Backend - Install Dependencies') {
            steps {
                echo '=== Stage: Backend Install Dependencies ==='
                dir('backend') {
                    bat '''
                    if not exist .venv (
                        echo Creating Python virtual environment...
                        python -m venv .venv
                    )
                    .venv\\Scripts\\python -m pip install --upgrade pip
                    .venv\\Scripts\\pip install -e ".[dev]"
                    '''
                }
            }
        }

        stage('Backend - Run Tests') {
            steps {
                echo '=== Stage: Backend Run Tests ==='
                dir('backend') {
                    bat '.venv\\Scripts\\pytest'
                }
            }
        }

        stage('Frontend - Install Dependencies') {
            steps {
                echo '=== Stage: Frontend Install Dependencies ==='
                dir('frontend') {

                    bat 'npm install'
                }
            }
        }

        stage('Frontend - Build') {
            steps {
                echo '=== Stage: Frontend Build ==='
                dir('frontend') {
                
                    bat 'npm run build'
                }
            }
        }
    }

    post {
        success {
            echo '=============================================================='
            echo ' SUCCESS: All stages in the Jenkins pipeline passed successfully!'
            echo '=============================================================='
        }
        failure {
            echo '=============================================================='
            echo ' FAILURE: One or more stages in the Jenkins pipeline failed.'
            echo '=============================================================='
        }
        always {
            echo "Build #${env.BUILD_NUMBER} completed with status: ${currentBuild.currentResult}"
        }
    }
}
