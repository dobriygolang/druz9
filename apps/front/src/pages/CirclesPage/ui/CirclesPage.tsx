import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { circleApi } from '@/features/Circle/api/circleApi'
import type { Circle } from '@/entities/Circle/model/types'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'

const PLACEHOLDER_CIRCLES: Circle[] = [
  { id: '1', name: 'Frontend Dev RU', description: 'Для frontend разработчиков', memberCount: 234, tags: ['react', 'typescript'], isJoined: true, creatorId: '', createdAt: '' },
  { id: '2', name: 'Golang Moscow', description: 'Go разработчики Москвы', memberCount: 156, tags: ['go', 'backend'], isJoined: false, creatorId: '', createdAt: '' },
  { id: '3', name: 'System Design', description: 'Обсуждение архитектуры', memberCount: 98, tags: ['architecture'], isJoined: false, creatorId: '', createdAt: '' },
  { id: '4', name: 'LeetCode Club', description: 'Решаем задачи вместе', memberCount: 412, tags: ['algorithms'], isJoined: true, creatorId: '', createdAt: '' },
  { id: '5', name: 'DevOps & Cloud', description: 'Kubernetes, Docker, CI/CD', memberCount: 187, tags: ['devops'], isJoined: false, creatorId: '', createdAt: '' },
  { id: '6', name: 'Open Source RU', description: 'Open source contributors', memberCount: 73, tags: ['oss'], isJoined: false, creatorId: '', createdAt: '' },
]

export function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])

  useEffect(() => {
    circleApi.listCircles()
      .then(cs => setCircles(cs.length > 0 ? cs : PLACEHOLDER_CIRCLES))
      .catch(() => setCircles(PLACEHOLDER_CIRCLES))
  }, [])

  const handleJoin = async (id: string) => {
    try {
      const updated = await circleApi.joinCircle(id)
      setCircles(prev => prev.map(c => c.id === id ? updated : c))
    } catch {}
  }

  return (
    <div className="px-6 pt-4 pb-6">
      <div className="grid grid-cols-3 gap-4">
        {circles.map((circle) => (
          <Card key={circle.id} padding="lg" className="stagger-item flex flex-col gap-3 hover:border-[#94a3b8] transition-colors">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#6366f1]" />
              </div>
              {circle.isJoined && <Badge variant="success">Участник</Badge>}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[#111111]">{circle.name}</h3>
              <p className="text-xs text-[#666666] mt-1 line-clamp-2">{circle.description}</p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {circle.tags.slice(0, 2).map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-[#F2F3F0] text-[#475569] rounded-full">#{tag}</span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-[#666666]">
                <Users className="w-3 h-3" /> {circle.memberCount}
              </span>
              {!circle.isJoined && (
                <Button size="sm" variant="secondary" onClick={() => handleJoin(circle.id)}>
                  Вступить
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
