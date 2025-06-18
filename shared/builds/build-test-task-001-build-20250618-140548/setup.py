from setuptools import setup, find_packages

setup(
    name="test-api-service",
    version="1.0.0",
    description="A REST API service for testing",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.8",
)