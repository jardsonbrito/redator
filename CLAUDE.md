# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANTE: Sempre responda em português quando trabalhar neste projeto.**

## Project Overview

This is "Redator" - a comprehensive educational platform focused on essay writing (redação) for Brazilian students, particularly for ENEM (National High School Exam) preparation. The platform serves multiple user types: students, teachers (professores), correctors (corretores), and administrators.

## Technology Stack

- **Frontend**: React 18 with TypeScript, Vite
- **UI Framework**: shadcn/ui with Radix UI components 
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State Management**: TanStack Query (React Query) + Context API
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Essential Commands

```bash
# Development
npm run dev                    # Start dev server on localhost:8080
npm run build                  # Production build
npm run build:dev              # Development build
npm run preview                # Preview production build

# Code Quality
npm run lint                   # Run ESLint
```

## Architecture Overview

### User Types and Authentication

The platform supports 4 distinct user types with separate authentication flows:

1. **Students (Alunos)**: Access essays, exercises, virtual classes, library
2. **Visitors (Visitantes)**: Limited access, registration-free 
3. **Teachers (Professores)**: Manage classes, students, content creation
4. **Correctors (Corretores)**: Review and grade student essays
5. **Admins**: Full platform management

### Key Directories

- `src/pages/` - Route components organized by user type:
  - `admin/` - Administrator dashboard and management
  - `professor/` - Teacher-specific pages  
  - `corretor/` - Corrector interface
  - Root level for student/general pages
- `src/components/` - Reusable UI components organized by feature:
  - `admin/` - Admin-specific components
  - `professor/` - Teacher components
  - `corretor/` - Corrector components
  - `ui/` - shadcn/ui components
  - `shared/` - Cross-user-type components
- `src/hooks/` - Custom React hooks for auth, data fetching, business logic
- `src/utils/` - Utility functions for validation, formatting, file handling
- `src/integrations/supabase/` - Database client, types, queries

### Database Schema (Supabase)

Key tables include:
- `alunos` - Student records
- `professores` - Teacher accounts  
- `corretores` - Corrector accounts
- `admin_users` - Administrator accounts
- `temas` - Essay themes/topics with image handling
- `redacoes_enviadas` - Submitted essays
- `aulas` - Lessons with video integration
- `simulados` - Mock exams
- `turmas` - Classes/groups

### Authentication Pattern

Each user type has its own auth context and hook:
- `useAuth` - Admin authentication
- `useStudentAuth` - Student/visitor authentication  
- `useProfessorAuth` - Teacher authentication
- `useCorretorAuth` - Corrector authentication

Protected routes use corresponding ProtectedRoute components.

### File Upload & Media

- **Supabase Storage**: Used for images, documents, audio files
- **Video Integration**: YouTube, Vimeo, Instagram with automatic thumbnail extraction
- **Image Processing**: Upload validation, resizing, format conversion
- **Audio Recording**: Corrector voice feedback feature

### Real-time Features

- Virtual class attendance tracking
- Real-time essay status updates
- Live help chat system (Ajuda Rápida)
- Essay grading notifications

## Important Implementation Notes

### Image Handling System

The platform has sophisticated image handling for themes and lessons:
- **Theme covers**: Priority system (video thumbnail → manual upload → placeholder)
- **Video thumbnails**: Automatic extraction from YouTube, Vimeo, Instagram
- **Upload validation**: Format, size, dimension checks
- **Storage**: Organized in Supabase buckets with proper RLS policies

### Multi-tenant Data Access

- Students see only content from their assigned class (turma)
- Teachers manage multiple classes
- Correctors see essays assigned to them
- Admins have full access with proper filtering

### Form Validation Patterns

Uses React Hook Form + Zod extensively with custom validation utilities:
- Email normalization and validation
- File upload validation (size, format, dimensions)
- Business logic validation (essay submission rules, class assignments)

### Performance Optimizations

- TanStack Query caching with 5-minute stale time
- Lazy loading for large components
- Image optimization and CDN usage
- Debounced search and filtering

## Development Guidelines

### Component Organization

- Group components by user type and feature domain
- Use barrel exports where appropriate  
- Follow shadcn/ui patterns for new UI components
- Implement proper TypeScript interfaces

### State Management

- Use React Context for user authentication state
- TanStack Query for server state and caching
- Avoid Redux - prefer local state and custom hooks
- Use Zustand only for complex client state if needed

### Database Queries

- Utilize Supabase RLS policies for data security
- Use TypeScript types generated from database schema
- Implement proper error handling for database operations
- Follow existing patterns for CRUD operations

### Error Handling

- Use toast notifications for user feedback (Sonner)
- Implement proper loading states for async operations
- Handle network failures gracefully
- Log errors appropriately without exposing sensitive data

### Responsive Design

- Mobile-first approach with Tailwind CSS
- Use shadcn/ui responsive patterns
- Test on mobile devices (many users are on mobile)
- Consider different screen sizes for educational content

## Common Development Tasks

### Adding New User Role Features

1. Create pages in appropriate directory (`admin/`, `professor/`, etc.)
2. Add routes in `App.tsx` with proper protection
3. Create role-specific components 
4. Update authentication contexts if needed
5. Test with proper user role permissions

### Working with Essays (Redações)

- Essay submission flow is complex with multiple states
- Corrector assignment and grading workflow
- File upload handling for handwritten essays
- Real-time status updates and notifications

### Video Integration

- Use existing video utilities in `utils/aulaImageUtils.ts`
- Follow thumbnail extraction patterns
- Handle CORS issues for video frame capture
- Implement proper fallbacks for unsupported platforms

### Database Migrations

- Supabase migrations are in `supabase/migrations/`
- Follow existing naming conventions
- Test migrations thoroughly with existing data
- Update TypeScript types after schema changes

## Testing Notes

The project currently focuses on manual testing. When adding new features:
- Test all user types and their access levels
- Verify file upload functionality across different browsers
- Test responsive design on mobile devices
- Validate form submissions and error states
- Test real-time features when applicable

## Key Files for Understanding

- `src/App.tsx` - Main routing and context setup
- `src/main.tsx` - Application entry point with query client
- `src/integrations/supabase/client.ts` - Database configuration
- `src/hooks/useAuth.tsx` - Authentication patterns
- `docs/AULAS_COVERS_SYSTEM.md` - Video/image handling system
- `docs/TEMA_FORM_UPGRADE.md` - Complex form implementation example