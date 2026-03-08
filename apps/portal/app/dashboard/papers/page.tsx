'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Typography, Space, App, Row, Col, Select, Pagination, Skeleton, Tag, Badge, Input } from 'antd';
import { PlayCircleOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { Paper, ExamSession } from '@/types';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function PapersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    // URL State management
    const page = Number(searchParams.get('page')) || 1;
    const subject = searchParams.get('subject') || 'all';
    const board = searchParams.get('board') || 'all';
    const type = searchParams.get('type') || 'all';
    const query = searchParams.get('q') || '';

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!value || value === 'all') {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        params.set('page', '1'); // Reset to page 1 on filter change
        router.push(`${pathname}?${params.toString()}`);
    };

    // Fetch papers with pagination and filters
    const { data, isLoading } = useQuery<{ data: Paper[], total: number }>({
        queryKey: ['papers', page, subject, board, type, query],
        queryFn: async () => {
            const params = new URLSearchParams();

            // Use specialized search endpoint if query is present
            if (query) {
                params.append('q', query);
                const res = await api.get('/papers/search', { params });
                return res.data;
            }

            if (subject !== 'all') params.append('subject', subject);
            if (board !== 'all') params.append('exam_board', board);
            if (type !== 'all') params.append('type', type);
            params.append('page', page.toString());
            params.append('limit', '8');

            const res = await api.get('/papers', { params });
            // Aligning with backend response structure { data: result, total: count }
            return res.data;
        },
    });

    const papers = data?.data || [];
    const total = data?.total || 0;

    // Mutation to start exam
    const startExamMutation = useMutation({
        mutationFn: async (paperId: string) => {
            const res = await api.post<ExamSession>('/exams/start', { paper_id: paperId });
            return res.data;
        },
        onSuccess: (data) => {
            message.success('Exam session started!');
            router.push(`/dashboard/exams/${data.session_id}`);
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to start exam');
        },
    });

    // Mutation to Purchase Paper
    const purchaseMutation = useMutation({
        mutationFn: async (paperId: string) => {
            const res = await api.post(`/papers/${paperId}/purchase`);
            return res.data;
        },
        onSuccess: () => {
            message.success('Paper purchased successfully!');
            // Refetch papers to update UI
            queryClient.invalidateQueries({ queryKey: ['papers'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.error || 'Purchase failed');
        },
    });

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Title level={2} style={{ margin: 0 }}>Browse Exam Papers</Title>

                    <Search
                        placeholder="Search by title, subject or tags..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="large"
                        onSearch={(v) => updateFilters('q', v)}
                        defaultValue={query}
                        style={{ maxWidth: 400, width: '100%' }}
                    />

                    <Space size="middle" wrap>
                        <Select
                            placeholder="Subject"
                            style={{ width: 150 }}
                            value={subject}
                            onChange={(v) => updateFilters('subject', v)}
                        >
                            <Option value="all">All Subjects</Option>
                            <Option value="Mathematics">Mathematics</Option>
                            <Option value="Science">Science</Option>
                            <Option value="English">English</Option>
                        </Select>
                        <Select
                            placeholder="Board"
                            style={{ width: 120 }}
                            value={board}
                            onChange={(v) => updateFilters('board', v)}
                        >
                            <Option value="all">All Boards</Option>
                            <Option value="GCE_A">GCE A/L</Option>
                            <Option value="GCE_O">GCE O/L</Option>
                        </Select>
                        <Select
                            placeholder="Type"
                            style={{ width: 140 }}
                            value={type}
                            onChange={(v) => updateFilters('type', v)}
                        >
                            <Option value="all">All Types</Option>
                            <Option value="past_paper">Past Paper</Option>
                            <Option value="model_paper">Model Paper</Option>
                        </Select>
                    </Space>
                </div>

                {isLoading ? (
                    <Row gutter={[24, 24]}>
                        {[1, 2, 3, 4].map(i => (
                            <Col xs={24} sm={12} md={8} lg={6} key={i}>
                                <Card>
                                    <Skeleton active avatar paragraph={{ rows: 3 }} />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : papers.length > 0 ? (
                    <>
                        <Row gutter={[24, 24]}>
                            {papers.map((paper) => (
                                <Col xs={24} sm={12} md={8} lg={6} key={paper.id}>
                                    <Card
                                        hoverable
                                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                        actions={[
                                            paper.is_purchased ? (
                                                <Button
                                                    type="primary"
                                                    key="start"
                                                    icon={<PlayCircleOutlined />}
                                                    loading={startExamMutation.isPending && startExamMutation.variables === paper.id}
                                                    onClick={() => startExamMutation.mutate(paper.id)}
                                                    block
                                                >
                                                    Start Exam
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="default"
                                                    key="buy"
                                                    style={{ border: '1px solid #1677ff', color: '#1677ff' }}
                                                    loading={purchaseMutation.isPending && purchaseMutation.variables === paper.id}
                                                    onClick={() => purchaseMutation.mutate(paper.id)}
                                                    block
                                                >
                                                    Buy Now
                                                </Button>
                                            )
                                        ]}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ marginBottom: 12 }}>
                                                <Tag color={paper.type === 'past_paper' ? 'blue' : 'green'}>
                                                    {paper.type === 'past_paper' ? 'Past Paper' : 'Model Paper'}
                                                </Tag>
                                                <Tag color="orange">{paper.exam_board}</Tag>
                                            </div>
                                            <Title level={4} style={{ marginBottom: 8 }}>{paper.title}</Title>
                                            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                                                Subject: {paper.subject}<br />
                                                Year: {paper.year}
                                            </Paragraph>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong style={{ fontSize: 18, color: '#1677ff' }}>
                                                    LKR {(paper.price_lkr || 0).toLocaleString()}
                                                </Text>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                            <Pagination
                                current={page}
                                total={total}
                                pageSize={8}
                                onChange={(p) => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set('page', p.toString());
                                    router.push(`${pathname}?${params.toString()}`);
                                }}
                            />
                        </div>
                    </>
                ) : (
                    <Card style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Text type="secondary">No papers found matching your criteria.</Text>
                    </Card>
                )}
            </Space>
        </div>
    );
}
