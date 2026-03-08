'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Layout, Spin } from 'antd';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" description="Verifying Session..." />
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <Layout style={{ minHeight: '100vh' }}>
                <Header />
                <Layout style={{ marginTop: 64 }}>
                    <Sidebar />
                    <Content style={{
                        marginLeft: 200,
                        padding: '24px',
                        background: '#f5f5f5',
                        minHeight: 'calc(100vh - 64px)',
                        transition: 'all 0.2s'
                    }}>
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </ProtectedRoute>
    );
}