'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, Typography, Space, Radio, Button, Spin, Result, Modal, App, Divider, List, Tag, Badge, Row, Col, Alert } from 'antd';
import { useState } from 'react';
import api from '@/lib/api';
import { Question, AnswerResponse, SubmissionResponse } from '@/types';
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PolarAngleAxis } from 'recharts';

const { Title, Paragraph, Text } = Typography;

export default function ExamPage() {
    const { id: sessionId } = useParams();
    const router = useRouter();
    const { message } = App.useApp();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctChoiceId?: string } | null>(null);
    const [examResult, setExamResult] = useState<SubmissionResponse | null>(null);

    // Fetch Questions
    const { data: questions, isLoading } = useQuery<Question[]>({
        queryKey: ['exam-questions', sessionId],
        queryFn: async () => {
            const res = await api.get(`/exams/${sessionId}/questions`);
            return res.data;
        },
        enabled: !!sessionId,
    });



    // Mutation to Submit Answer
    const submitAnswerMutation = useMutation({
        mutationFn: async ({ questionId, choiceId }: { questionId: string; choiceId: string }) => {
            const res = await api.post<AnswerResponse>(`/exams/${sessionId}/answer`, {
                question_id: questionId,
                choice_id: choiceId,
            });
            return res.data;
        },
        onSuccess: (data) => {
            setFeedback({ isCorrect: data.is_correct, correctChoiceId: data.correct_choice_id });
            if (data.is_correct) {
                message.success('Correct answer!');
            } else {
                message.error('Incorrect answer.');
            }
        },
        onError: () => {
            message.error('Failed to submit answer');
        },
    });

    // Mutation to Finish Exam
    const finishExamMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post<SubmissionResponse>(`/exams/${sessionId}/submit`);
            return res.data;
        },
        onSuccess: (data) => {
            setExamResult(data);
        },
        onError: () => {
            message.error('Failed to finish exam');
        },
    });

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
                <Spin size="large" description="Loading Questions..." />
            </div>
        );
    }

    if (!questions || questions.length === 0) {
        return <Result status="404" title="No questions found for this exam." />;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const handleNext = () => {
        if (isLastQuestion) return;
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedChoiceId(null);
        setFeedback(null);
    };

    const handleSubmitAnswer = () => {
        if (!selectedChoiceId) {
            message.warning('Please select an option');
            return;
        }
        submitAnswerMutation.mutate({
            questionId: currentQuestion.id,
            choiceId: selectedChoiceId,
        });
    };

    if (examResult) {
        const scoreData = [
            {
                name: 'Score',
                value: Number(examResult.percentage),
                fill: Number(examResult.percentage) > 60 ? '#52c41a' : '#faad14',
            }
        ];

        return (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <Card style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Result
                        status="success"
                        title="Exam Completed!"
                        subTitle={`Your Score: ${examResult.score}/${examResult.total_questions} (${examResult.percentage}%)`}
                    />


                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Title level={4}>Overall Score</Title>
                        <div style={{ height: 350, width: '100%', maxWidth: 500, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="70%"
                                    outerRadius="100%"
                                    barSize={50}
                                    data={scoreData}
                                    startAngle={210}
                                    endAngle={-30}
                                >
                                    <PolarAngleAxis
                                        type="number"
                                        domain={[0, 100]}
                                        angleAxisId={0}
                                        tick={false}
                                    />
                                    <RadialBar
                                        background
                                        dataKey="value"
                                        cornerRadius={25}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <Title level={1} style={{ fontSize: 64, margin: 0, color: scoreData[0].fill }}>{examResult.percentage}%</Title>
                                <Text type="secondary" style={{ fontSize: 18 }}>Overall score</Text>
                            </div>
                        </div>
                    </div>

                    <Space style={{ marginTop: 24 }}>
                        <Button size="large" type="primary" onClick={() => router.push('/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </Space>
                </Card>

            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Card
                title={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
                extra={<Button danger onClick={() => finishExamMutation.mutate()}>Finish Exam Early</Button>}
            >
                <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <Title level={4}>{currentQuestion.content}</Title>

                    <Radio.Group
                        onChange={(e) => setSelectedChoiceId(e.target.value)}
                        value={selectedChoiceId}
                        disabled={!!feedback}
                        style={{ width: '100%' }}
                    >
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            {currentQuestion.choices.map((choice) => {
                                let color = 'inherit';
                                if (feedback) {
                                    if (choice.id === selectedChoiceId) {
                                        color = feedback.isCorrect ? '#52c41a' : '#f5222d';
                                    } else if (choice.id === feedback.correctChoiceId) {
                                        color = '#52c41a'; // Highlight correct one if user was wrong
                                    }
                                }

                                return (
                                    <Card
                                        key={choice.id}
                                        size="small"
                                        hoverable={!feedback}
                                        style={{
                                            borderColor: color !== 'inherit' ? color : undefined,
                                            backgroundColor: choice.id === selectedChoiceId ? '#f0faff' : undefined
                                        }}
                                    >
                                        <Radio value={choice.id}>
                                            <Text style={{ color }}>{choice.content}</Text>
                                        </Radio>
                                    </Card>
                                );
                            })}
                        </Space>
                    </Radio.Group>

                    <Space>
                        {!feedback ? (
                            <Button
                                type="primary"
                                onClick={handleSubmitAnswer}
                                loading={submitAnswerMutation.isPending}
                            >
                                Submit Answer
                            </Button>
                        ) : (
                            <>
                                {!isLastQuestion ? (
                                    <Button type="primary" onClick={handleNext}>Next Question</Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        onClick={() => finishExamMutation.mutate()}
                                        loading={finishExamMutation.isPending}
                                    >
                                        Finish Exam
                                    </Button>
                                )}
                            </>
                        )}
                    </Space>
                </Space>
            </Card>
        </div>
    );
}
