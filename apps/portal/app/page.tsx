'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button, Typography, Space, Card, Spin } from 'antd';
import { LoginOutlined, UserAddOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 500, textAlign: 'center', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ fontSize: 48, color: '#1677ff' }}>🎓</div>
          <Title level={2}>Paper Management System</Title>
          <Paragraph type="secondary">
            Access past papers, practice exams, and track your progress in real-time.
          </Paragraph>

          <Space size="middle">
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              onClick={() => router.push('/login')}
              style={{ width: 140 }}
            >
              Login
            </Button>
            <Button
              size="large"
              icon={<UserAddOutlined />}
              onClick={() => router.push('/register')}
              style={{ width: 140 }}
            >
              Register
            </Button>
          </Space>

          <div style={{ marginTop: 20 }}>
            <Typography.Text style={{ color: '#bfbfbf', fontSize: 12 }}>
              Built with Next.js 15 & Cloudflare Workers
            </Typography.Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}