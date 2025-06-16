# 🚀 PROJECT2 KICKOFF: ServiceBot Development

## **MISSION: Build ServiceBot to 100% Completion**

You are part of a 3-agent development team building **ServiceBot** - an AI-powered local services marketplace. Your mission is to work autonomously for 1-2 hours and deliver a fully functional application following the PRD specifications.

---

## **⚡ IMMEDIATE ACTION REQUIRED**

### **1. READ THE PRD COMPLETELY (5 minutes)**
- Open and read `projects/project2/PRD.md` thoroughly
- Understand the full scope, features, and technical requirements
- Note your role's specific responsibilities

### **2. UPDATE YOUR CLAUDE.MD (5 minutes)**
- Ensure your `CLAUDE.md` accurately reflects your role
- Add project2-specific context and responsibilities
- Commit any updates immediately

### **3. CREATE COMPREHENSIVE TODOS (10 minutes)**
- Break down the PRD into detailed, actionable todos
- Each todo should represent 15-30 minutes of focused work
- Focus on ONE feature at a time for perfection
- Use the TodoWrite tool to create your initial task list

### **4. START BUILDING (1-2 hours of focused work)**
- Work systematically through your todos
- Update progress every 15-30 minutes
- Commit code frequently with descriptive messages
- Coordinate through task-board.json updates

---

## **🎯 YOUR ROLE-SPECIFIC RESPONSIBILITIES**

### **If you're the ARCHITECT:**
**Primary Focus:** System design, coordination, and task management

**Immediate Todos to Create:**
1. **Analyze PRD and create system architecture** (30 mins)
   - Database schema design based on PRD requirements
   - API endpoints specification for all features
   - Frontend component hierarchy planning
   - Technology stack confirmation

2. **Create detailed task breakdown for Builder** (20 mins)
   - Break each PRD feature into specific implementation tasks
   - Assign priorities and dependencies
   - Create task-board.json entries with clear acceptance criteria

3. **Set up project coordination** (15 mins)
   - Initialize project2 coordination documents
   - Create PROJECT_PLAN.md for project2
   - Set up progress tracking mechanisms

4. **Monitor and coordinate team progress** (Ongoing)
   - Update task assignments based on progress
   - Resolve blockers and architectural questions
   - Ensure feature completeness against PRD

### **If you're the BUILDER:**
**Primary Focus:** Full-stack implementation

**Immediate Todos to Create:**
1. **Set up Supabase backend** (30 mins)
   - Create Supabase project and configure authentication
   - Implement database schema from PRD specifications
   - Set up Row Level Security policies
   - Test basic CRUD operations

2. **Initialize React frontend** (20 mins)
   - Set up Vite + React + TypeScript + Tailwind
   - Configure routing and basic layout
   - Integrate Supabase client
   - Create reusable UI components

3. **Implement user authentication** (25 mins)
   - Build registration and login forms
   - Integrate Supabase Auth
   - Create protected routes
   - Add profile management

4. **Build AI chatbot for ad creation** (35 mins)
   - Design conversational flow for ad creation
   - Integrate OpenAI/Claude API
   - Create chat interface components
   - Implement ad preview functionality

5. **Continue with remaining features** (Based on Architect's priorities)
   - Service ad management
   - Search and discovery
   - Messaging system
   - Review system

### **If you're the VALIDATOR:**
**Primary Focus:** Testing, quality assurance, and deployment

**Immediate Todos to Create:**
1. **Set up testing infrastructure** (20 mins)
   - Configure Jest + React Testing Library
   - Set up Supabase testing environment
   - Create test database seeding scripts
   - Configure coverage reporting

2. **Write comprehensive tests for authentication** (25 mins)
   - Unit tests for auth components
   - Integration tests for Supabase auth flow
   - End-to-end user registration testing
   - Security testing for protected routes

3. **Test database operations** (20 mins)
   - Test all CRUD operations
   - Validate schema constraints
   - Test Row Level Security policies
   - Performance testing for queries

4. **Validate AI chatbot functionality** (25 mins)
   - Test conversational flows
   - Validate API integrations
   - Test error handling scenarios
   - Ensure response quality and consistency

5. **Quality assurance and deployment prep** (20 mins)
   - Code quality checks (ESLint, TypeScript)
   - Performance benchmarking
   - Security scanning
   - Deployment configuration validation

---

## **📋 TODO MANAGEMENT RULES (CRITICAL)**

### **Todo Creation Standards:**
- **Granular**: Each todo = 15-30 minutes of work
- **Specific**: Clear action verbs and deliverables
- **Testable**: Include acceptance criteria
- **Sequential**: Dependencies clearly defined

### **Example Perfect Todo Structure:**
```
Todo: "Implement user registration with Supabase Auth"
Time Estimate: 25 minutes
Acceptance Criteria:
- Registration form with validation
- Supabase Auth integration working
- Email verification flow
- Error handling for edge cases
- Unit tests written and passing
Dependencies: ["Supabase project setup"]
```

### **Update Frequency Requirements:**
- **Every 15 minutes**: Update todo progress
- **Every 30 minutes**: Commit code changes
- **Every feature completion**: Update task-board.json
- **Every hour**: Sync with other agents

---

## **🔄 COORDINATION PROTOCOL**

### **Task Board Management:**
1. **Check task-board.json every 30 minutes**
2. **Update your task status immediately when changed**
3. **Add blockers or dependencies as they arise**
4. **Create new tasks if gaps are discovered**

### **Communication Standards:**
- **Commit messages**: Descriptive and feature-focused
- **Task updates**: Include specific progress details
- **Blockers**: Immediate escalation with specific details
- **Completions**: Include verification steps taken

### **Quality Gates:**
- **Code**: TypeScript strict mode, no ESLint warnings
- **Tests**: 90%+ coverage for new code
- **Features**: All PRD acceptance criteria met
- **Performance**: Fast loading, responsive UI

---

## **🎯 SUCCESS CRITERIA**

### **Individual Success (Check every 30 minutes):**
- [ ] Todos are detailed and current
- [ ] Progress is documented and committed
- [ ] Code quality standards maintained
- [ ] Features match PRD specifications

### **Team Success (Check every hour):**
- [ ] Task coordination is smooth
- [ ] No blockers are unresolved
- [ ] Integration between components works
- [ ] Overall progress toward completion

### **Project Success (End goal):**
- [ ] All PRD features implemented
- [ ] Full test coverage achieved
- [ ] Application is deployable
- [ ] User experience is polished

---

## **🚨 WORKFLOW EXECUTION**

### **Hour 1: Foundation & Setup**
- Complete PRD analysis and todo creation
- Set up technical infrastructure
- Begin core feature implementation
- Establish coordination rhythms

### **Hour 2: Feature Development**
- Implement primary features systematically
- Maintain test coverage and quality
- Coordinate feature integration
- Address any emerging requirements

### **Success Indicators:**
- Steady commit frequency (every 20-30 minutes)
- Regular todo updates and completions
- Smooth inter-agent coordination
- Visible feature progress

---

## **💪 YOUR COMMITMENT**

By accepting this mission, you commit to:

1. **📖 Reading**: Complete PRD analysis before starting
2. **📝 Planning**: Detailed todo creation with time estimates
3. **⚡ Executing**: Focused 1-2 hours of systematic development
4. **🔄 Coordinating**: Regular updates and team communication
5. **✅ Delivering**: Working features that match PRD specifications

**Remember**: This is a test of our multi-agent development workflow. Your success demonstrates the power of AI-driven collaborative development.

**Ready? Let's build something amazing! 🚀**

---

**Next Step**: Use TodoWrite to create your initial detailed task list, then start building!