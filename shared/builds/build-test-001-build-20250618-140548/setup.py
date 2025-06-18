from setuptools import setup, find_packages

setup(
    name="test-api-service",
    version="1.0.0",
    description="A simple REST API for testing architect functionality",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.8",
)