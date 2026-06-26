pipeline {
    agent any

    options {
        // Prevent concurrent builds on the same workspace to avoid lock conflicts
        disableConcurrentBuilds()
        // Skip subsequent stages if any stage is unstable or fails
        skipStagesAfterUnstable()
        // Enforce a timeout of 30 minutes to prevent hung pipelines
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                echo '=== Stage: Checkout ==='
                // Explicitly checkout source code from Git repository
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                echo '=== Stage: Verify Tools ==='
                // Verify versions of Git, Python, Node.js, and npm installed on Windows host
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
                    // Create virtual environment if not present and install backend package dependencies
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
                    // Run test suite using pytest from the virtual environment
                    bat '.venv\\Scripts\\pytest'
                }
            }
        }

        stage('Frontend - Install Dependencies') {
            steps {
                echo '=== Stage: Frontend Install Dependencies ==='
                dir('frontend') {
                    // Install all Node.js dependencies for the Next.js frontend
                    bat 'npm install'
                }
            }
        }

        stage('Frontend - Build') {
            steps {
                echo '=== Stage: Frontend Build ==='
                dir('frontend') {
                    // Build production optimized frontend assets
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
