# Vercel 배포 가이드

## 1단계: Vercel 계정 준비
1. https://vercel.com 에서 GitHub 계정으로 로그인
2. 새 프로젝트 생성

## 2단계: 환경 변수 설정
프로젝트 설정에서 다음 환경 변수 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://gkqpyndjezgocpvrqrfc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcXB5bmRqZXpnb2NwdnJxcmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQwNzcsImV4cCI6MjA2ODQyMDA3N30.KokKEVlJvX4EMxPHPY_3Hd3HCDjPLK_lTjBSRQU6kg0
SUPABASE_AUTH_EXTERNAL_REDIRECT_URL=https://your-app.vercel.app/auth/callback
```

## 3단계: Supabase 설정 업데이트
Supabase 대시보드에서:
1. Authentication > URL Configuration
2. Site URL: https://your-app.vercel.app
3. Redirect URLs: https://your-app.vercel.app/auth/callback

## 4단계: 데이터베이스 마이그레이션
1. Supabase 대시보드에서 SQL Editor 열기
2. migrations 폴더의 SQL 파일들을 순서대로 실행

## 5단계: 배포 확인
- 빌드 성공 확인
- 인증 기능 테스트
- 데이터베이스 연동 확인
- 메신저 기능 테스트