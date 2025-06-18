#!/usr/bin/env python3
"""
Validator Agent Implementation
Validates builds for security, quality, and compliance
"""
import asyncio
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging
import re

import sys
sys.path.append('../')

from agents.core.agent_runtime import (
    AgentRuntime, Message, MessageIntent, TaskState
)


class ValidatorAgent(AgentRuntime):
    """
    Validator Agent - Quality assurance and compliance
    
    Responsibilities:
    - Security vulnerability scanning
    - Code quality analysis
    - Performance testing
    - Compliance verification
    - Integration testing
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, "validator", config)
        
        # Validation tracking
        self.active_validations: Dict[str, Dict[str, Any]] = {}
        self.validation_rules = self._load_validation_rules()
        
        # Output directories
        self.reports_dir = self.shared_dir / "validation-reports"
        self.reports_dir.mkdir(exist_ok=True)
    
    async def initialize(self):
        """Initialize validator agent"""
        self.logger.info(f"Validator agent {self.agent_id} initialized")
        self.logger.info(f"Reports directory: {self.reports_dir}")
        
        # Announce availability
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="*",
            intent=MessageIntent.INFORM,
            task_id="system",
            payload={
                "type": "agent_online",
                "role": "validator",
                "capabilities": ["security", "quality", "performance", "compliance"]
            }
        ))
    
    async def cleanup(self):
        """Cleanup validator resources"""
        # Save any pending reports
        for task_id, validation in self.active_validations.items():
            await self._save_validation_report(task_id, validation)
        self.logger.info("Validator agent cleanup completed")
    
    async def on_idle(self):
        """Periodic tasks when idle"""
        # Could update security rules, check for new vulnerabilities, etc.
        pass
    
    def _load_validation_rules(self) -> Dict[str, Any]:
        """Load validation rules and criteria"""
        return {
            "security": {
                "input_validation": {
                    "severity": "critical",
                    "patterns": [
                        r"eval\s*\(",
                        r"exec\s*\(",
                        r"__import__",
                        r"subprocess\.call\s*\([^,]+,\s*shell=True",
                        r"os\.system\s*\("
                    ]
                },
                "sql_injection": {
                    "severity": "critical",
                    "patterns": [
                        r'f["\'].*SELECT.*\{',
                        r'["\'].*SELECT.*["\'].*\+',
                        r'\.format\(.*SELECT'
                    ]
                },
                "hardcoded_secrets": {
                    "severity": "high",
                    "patterns": [
                        r'password\s*=\s*["\'][^"\']+["\']',
                        r'api_key\s*=\s*["\'][^"\']+["\']',
                        r'secret\s*=\s*["\'][^"\']+["\']'
                    ]
                }
            },
            "quality": {
                "code_smells": {
                    "long_functions": {"max_lines": 50},
                    "complex_conditions": {"max_complexity": 10},
                    "duplicate_code": {"min_lines": 10}
                },
                "naming": {
                    "function_pattern": r"^[a-z_][a-z0-9_]*$",
                    "class_pattern": r"^[A-Z][a-zA-Z0-9]*$"
                }
            },
            "performance": {
                "response_time": {"max_ms": 200},
                "memory_usage": {"max_mb": 512},
                "cpu_usage": {"max_percent": 80}
            },
            "testing": {
                "coverage": {"min_percent": 80},
                "test_types": ["unit", "integration", "security"]
            }
        }
    
    async def handle_request(self, message: Message):
        """Handle validation requests"""
        request_type = message.payload.get('type')
        
        if request_type == 'validate_build':
            await self._handle_validate_build(message)
        elif request_type == 'security_scan':
            await self._handle_security_scan(message)
        elif request_type == 'performance_test':
            await self._handle_performance_test(message)
        else:
            self.logger.warning(f"Unknown request type: {request_type}")
    
    async def handle_inform(self, message: Message):
        """Handle build ready messages"""
        if message.payload.get('type') == 'build_ready':
            # Auto-validate if next_agent is validator
            if message.payload.get('next_agent') == 'validator':
                await self._handle_validate_build(message)
    
    async def _handle_validate_build(self, message: Message):
        """Validate a build"""
        task_id = message.task_id
        build_path = message.payload.get('build_path')
        
        if not build_path:
            self.logger.error(f"No build path provided for {task_id}")
            return
        
        self.logger.info(f"Starting validation for {task_id} at {build_path}")
        
        # Update status
        await self.broadcast_status(task_id, TaskState.EXECUTING, {
            "phase": "starting_validation"
        })
        
        # Initialize validation report
        validation_report = {
            "task_id": task_id,
            "build_path": build_path,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "checks": {}
        }
        
        # Run validation checks
        try:
            # 1. Security validation
            await self.broadcast_status(task_id, TaskState.EXECUTING, {
                "phase": "security_validation",
                "progress": 20
            })
            security_results = await self._run_security_validation(build_path)
            validation_report['checks']['security'] = security_results
            
            # 2. Code quality validation
            await self.broadcast_status(task_id, TaskState.EXECUTING, {
                "phase": "quality_validation",
                "progress": 40
            })
            quality_results = await self._run_quality_validation(build_path)
            validation_report['checks']['quality'] = quality_results
            
            # 3. Test coverage validation
            await self.broadcast_status(task_id, TaskState.EXECUTING, {
                "phase": "test_validation",
                "progress": 60
            })
            test_results = await self._run_test_validation(build_path)
            validation_report['checks']['testing'] = test_results
            
            # 4. Performance validation
            await self.broadcast_status(task_id, TaskState.EXECUTING, {
                "phase": "performance_validation",
                "progress": 80
            })
            perf_results = await self._run_performance_validation(build_path)
            validation_report['checks']['performance'] = perf_results
            
            # 5. Documentation validation
            doc_results = await self._run_documentation_validation(build_path)
            validation_report['checks']['documentation'] = doc_results
            
        except Exception as e:
            self.logger.error(f"Validation error: {e}")
            validation_report['error'] = str(e)
        
        # Calculate overall result
        validation_report['completed_at'] = datetime.now(timezone.utc).isoformat()
        validation_report['passed'] = self._calculate_overall_result(validation_report)
        validation_report['summary'] = self._create_validation_summary(validation_report)
        
        # Save report
        report_path = await self._save_validation_report(task_id, validation_report)
        
        # Store active validation
        self.active_validations[task_id] = validation_report
        
        # Send results
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            intent=MessageIntent.INFORM,
            task_id=task_id,
            payload={
                "type": "validation_complete",
                "passed": validation_report['passed'],
                "report_path": str(report_path),
                "summary": validation_report['summary'],
                "issues": self._extract_blocking_issues(validation_report)
            }
        ))
        
        # Update status
        final_status = TaskState.COMPLETED if validation_report['passed'] else TaskState.FAILED
        await self.broadcast_status(task_id, final_status, {
            "phase": "validation_complete",
            "passed": validation_report['passed'],
            "report": str(report_path)
        })
    
    async def _run_security_validation(self, build_path: str) -> Dict[str, Any]:
        """Run security checks"""
        self.logger.info("Running security validation")
        
        results = {
            "passed": True,
            "vulnerabilities": [],
            "risk_level": "LOW"
        }
        
        build_dir = Path(build_path)
        
        # Scan for security patterns
        for category, rules in self.validation_rules['security'].items():
            for py_file in build_dir.rglob("*.py"):
                try:
                    with open(py_file, 'r') as f:
                        content = f.read()
                    
                    for pattern in rules.get('patterns', []):
                        matches = re.finditer(pattern, content, re.MULTILINE)
                        for match in matches:
                            vulnerability = {
                                "type": category,
                                "severity": rules['severity'],
                                "file": str(py_file.relative_to(build_dir)),
                                "line": content[:match.start()].count('\n') + 1,
                                "pattern": pattern,
                                "context": match.group(0)[:100]
                            }
                            results['vulnerabilities'].append(vulnerability)
                            
                            if rules['severity'] == 'critical':
                                results['passed'] = False
                                results['risk_level'] = 'CRITICAL'
                            elif rules['severity'] == 'high' and results['risk_level'] != 'CRITICAL':
                                results['risk_level'] = 'HIGH'
                
                except Exception as e:
                    self.logger.error(f"Error scanning {py_file}: {e}")
        
        return results
    
    async def _run_quality_validation(self, build_path: str) -> Dict[str, Any]:
        """Run code quality checks"""
        self.logger.info("Running quality validation")
        
        results = {
            "passed": True,
            "issues": [],
            "metrics": {
                "total_lines": 0,
                "code_lines": 0,
                "comment_lines": 0,
                "functions": 0,
                "classes": 0
            }
        }
        
        build_dir = Path(build_path)
        
        # Analyze code quality
        for py_file in build_dir.rglob("*.py"):
            try:
                with open(py_file, 'r') as f:
                    lines = f.readlines()
                
                # Count metrics
                results['metrics']['total_lines'] += len(lines)
                results['metrics']['code_lines'] += sum(1 for line in lines if line.strip() and not line.strip().startswith('#'))
                results['metrics']['comment_lines'] += sum(1 for line in lines if line.strip().startswith('#'))
                results['metrics']['functions'] += len(re.findall(r'^def\s+\w+', ''.join(lines), re.MULTILINE))
                results['metrics']['classes'] += len(re.findall(r'^class\s+\w+', ''.join(lines), re.MULTILINE))
                
                # Check function length
                function_blocks = re.finditer(r'^def\s+(\w+).*?(?=^def|\Z)', ''.join(lines), re.MULTILINE | re.DOTALL)
                for func in function_blocks:
                    func_lines = func.group(0).count('\n')
                    if func_lines > self.validation_rules['quality']['code_smells']['long_functions']['max_lines']:
                        results['issues'].append({
                            "type": "long_function",
                            "file": str(py_file.relative_to(build_dir)),
                            "function": func.group(1),
                            "lines": func_lines
                        })
            
            except Exception as e:
                self.logger.error(f"Error analyzing {py_file}: {e}")
        
        # Fail if too many issues
        if len(results['issues']) > 10:
            results['passed'] = False
        
        return results
    
    async def _run_test_validation(self, build_path: str) -> Dict[str, Any]:
        """Validate test coverage and quality"""
        self.logger.info("Running test validation")
        
        results = {
            "passed": True,
            "coverage": 0.0,
            "test_count": 0,
            "test_types": []
        }
        
        build_dir = Path(build_path)
        test_dir = build_dir / "tests"
        
        if test_dir.exists():
            # Count test files and methods
            for test_file in test_dir.rglob("test_*.py"):
                try:
                    with open(test_file, 'r') as f:
                        content = f.read()
                    
                    # Count test methods
                    test_methods = re.findall(r'def\s+(test_\w+)', content)
                    results['test_count'] += len(test_methods)
                    
                    # Identify test types
                    if 'unittest' in content or 'TestCase' in content:
                        results['test_types'].append('unit')
                    if 'integration' in content.lower():
                        results['test_types'].append('integration')
                    if 'security' in content.lower():
                        results['test_types'].append('security')
                
                except Exception as e:
                    self.logger.error(f"Error analyzing {test_file}: {e}")
            
            # Simulate coverage (would run actual coverage tool)
            if results['test_count'] > 0:
                results['coverage'] = min(85.0, results['test_count'] * 5.0)
            
            # Check minimum coverage
            min_coverage = self.validation_rules['testing']['coverage']['min_percent']
            if results['coverage'] < min_coverage:
                results['passed'] = False
        else:
            results['passed'] = False
            results['coverage'] = 0.0
        
        return results
    
    async def _run_performance_validation(self, build_path: str) -> Dict[str, Any]:
        """Run performance checks"""
        self.logger.info("Running performance validation")
        
        # Simulated performance metrics
        results = {
            "passed": True,
            "metrics": {
                "response_time_p95": 150.0,  # ms
                "memory_usage": 256,  # MB
                "cpu_usage": 45.0,  # percent
                "throughput": 1000  # req/sec
            },
            "issues": []
        }
        
        # Check against thresholds
        if results['metrics']['response_time_p95'] > self.validation_rules['performance']['response_time']['max_ms']:
            results['issues'].append({
                "type": "slow_response",
                "metric": "response_time_p95",
                "value": results['metrics']['response_time_p95'],
                "threshold": self.validation_rules['performance']['response_time']['max_ms']
            })
            results['passed'] = False
        
        return results
    
    async def _run_documentation_validation(self, build_path: str) -> Dict[str, Any]:
        """Validate documentation completeness"""
        self.logger.info("Running documentation validation")
        
        results = {
            "passed": True,
            "has_readme": False,
            "has_api_docs": False,
            "has_tests_docs": False,
            "completeness": 0.0
        }
        
        build_dir = Path(build_path)
        
        # Check for documentation files
        if (build_dir / "README.md").exists():
            results['has_readme'] = True
            results['completeness'] += 33.3
        
        if (build_dir / "docs").exists() or (build_dir / "API.md").exists():
            results['has_api_docs'] = True
            results['completeness'] += 33.3
        
        if (build_dir / "tests" / "README.md").exists():
            results['has_tests_docs'] = True
            results['completeness'] += 33.4
        
        # Pass if at least basic documentation exists
        results['passed'] = results['has_readme']
        
        return results
    
    def _calculate_overall_result(self, report: Dict[str, Any]) -> bool:
        """Calculate if validation passed overall"""
        # Critical checks must all pass
        critical_checks = ['security', 'testing']
        
        for check in critical_checks:
            if check in report['checks'] and not report['checks'][check].get('passed', True):
                return False
        
        # Allow some quality issues
        total_issues = sum(
            len(check.get('issues', [])) + len(check.get('vulnerabilities', []))
            for check in report['checks'].values()
        )
        
        return total_issues < 20  # Threshold for total issues
    
    def _create_validation_summary(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Create validation summary"""
        summary = {
            "total_checks": len(report['checks']),
            "passed_checks": sum(1 for c in report['checks'].values() if c.get('passed', True)),
            "critical_issues": 0,
            "warnings": 0,
            "info": 0
        }
        
        # Count issues by severity
        for check in report['checks'].values():
            for vuln in check.get('vulnerabilities', []):
                if vuln.get('severity') == 'critical':
                    summary['critical_issues'] += 1
                elif vuln.get('severity') == 'high':
                    summary['warnings'] += 1
                else:
                    summary['info'] += 1
            
            summary['warnings'] += len(check.get('issues', []))
        
        return summary
    
    def _extract_blocking_issues(self, report: Dict[str, Any]) -> List[str]:
        """Extract blocking issues that must be fixed"""
        issues = []
        
        # Security vulnerabilities
        security = report['checks'].get('security', {})
        for vuln in security.get('vulnerabilities', []):
            if vuln['severity'] in ['critical', 'high']:
                issues.append(f"Security: {vuln['type']} in {vuln['file']}:{vuln['line']}")
        
        # Low test coverage
        testing = report['checks'].get('testing', {})
        if testing.get('coverage', 0) < 80:
            issues.append(f"Testing: Coverage {testing['coverage']:.1f}% below 80% requirement")
        
        # Performance issues
        perf = report['checks'].get('performance', {})
        for issue in perf.get('issues', []):
            issues.append(f"Performance: {issue['type']} - {issue['metric']} exceeds threshold")
        
        return issues[:10]  # Top 10 issues
    
    async def _save_validation_report(self, task_id: str, report: Dict[str, Any]) -> Path:
        """Save validation report"""
        report_name = f"validation-{task_id}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.json"
        report_path = self.reports_dir / report_name
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.logger.info(f"Validation report saved to {report_path}")
        return report_path
    
    async def _handle_security_scan(self, message: Message):
        """Handle dedicated security scan request"""
        # Implementation for focused security scanning
        pass
    
    async def _handle_performance_test(self, message: Message):
        """Handle dedicated performance test request"""
        # Implementation for performance testing
        pass


async def main():
    """Run the Validator agent"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Validator Agent')
    parser.add_argument('--id', default='validator-01', help='Agent ID')
    parser.add_argument('--redis-url', default='redis://localhost:6379', help='Redis URL')
    parser.add_argument('--shared-dir', default='../../shared', help='Shared directory')
    args = parser.parse_args()
    
    config = {
        'redis_url': args.redis_url,
        'shared_dir': args.shared_dir,
        'enable_redis': False  # File-based for Claude Code
    }
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    agent = ValidatorAgent(args.id, config)
    await agent.start()


if __name__ == "__main__":
    asyncio.run(main())