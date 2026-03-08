'use client';

import { Layout, Typography, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

export default function Header() {
    const { logout } = useAuth();

    return (
        <AntHeader style={{
            position: 'fixed',
            zIndex: 1000,
            width: '100%',
            color: '#ffffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: '64px'
        }}>
            <Title level={4} style={{ color: '#43dff7ff', margin: 0 }}>Exam Portal</Title>
            <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={logout}
                style={{ color: '#00d0ffff' }}
            >
                Logout
            </Button>
        </AntHeader>
    );
}
