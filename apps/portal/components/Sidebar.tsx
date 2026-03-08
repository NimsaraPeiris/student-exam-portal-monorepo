'use client';

import { Menu, Layout } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOutlined, FileTextOutlined, ShoppingCartOutlined } from '@ant-design/icons';

const { Sider } = Layout;

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        {
            key: '/dashboard',
            icon: <BookOutlined />,
            label: <Link href="/dashboard">My Exams</Link>,
        },
        {
            key: '/dashboard/papers',
            icon: <FileTextOutlined />,
            label: <Link href="/dashboard/papers">Browse Papers</Link>,
        },
        {
            key: '/dashboard/purchases',
            icon: <ShoppingCartOutlined />,
            label: <Link href="/dashboard/purchases">My Purchases</Link>,
        },
    ];

    // Determine active key based on pathname
    const activeKey = menuItems.find(item => pathname === item.key || (item.key !== '/dashboard' && pathname.startsWith(item.key + '/')))?.key || '/dashboard';

    return (
        <Sider
            width={200}
            theme="light"
            breakpoint="lg"
            collapsedWidth="0"
            style={{
                overflow: 'auto',
                height: 'calc(100vh - 64px)',
                position: 'fixed',
                left: 0,
                top: 64,
                bottom: 0,
                zIndex: 999
            }}
        >
            <Menu
                mode="inline"
                selectedKeys={[activeKey]}
                style={{ height: '100%', borderRight: 0 }}
                items={menuItems}
            />
        </Sider>
    );
}
