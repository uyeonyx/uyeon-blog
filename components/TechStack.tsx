'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/i18n-context'

interface TechItem {
  name: string
  items: string[]
}

interface TechCategory {
  title: string
  techs: TechItem[]
}

// 기술별 Simple Icons 매핑 (아이콘 + 브랜드 공식 색상)
const techIcons: Record<string, { icon: string; color: string }> = {
  // Backend
  'Node.js': { icon: 'simple-icons:nodedotjs', color: '#5FA04E' },
  TypeScript: { icon: 'simple-icons:typescript', color: '#3178C6' },
  Python: { icon: 'simple-icons:python', color: '#3776AB' },
  NestJS: { icon: 'simple-icons:nestjs', color: '#E0234E' },
  Express: { icon: 'simple-icons:express', color: '#000000' },
  FastAPI: { icon: 'simple-icons:fastapi', color: '#009688' },
  Prisma: { icon: 'simple-icons:prisma', color: '#2D3748' },
  MySQL: { icon: 'simple-icons:mysql', color: '#4479A1' },
  PostgreSQL: { icon: 'simple-icons:postgresql', color: '#4169E1' },
  MongoDB: { icon: 'simple-icons:mongodb', color: '#47A248' },
  Redis: { icon: 'simple-icons:redis', color: '#DC382D' },
  WebSocket: { icon: 'mdi:lan-connect', color: '#010101' },
  GraphQL: { icon: 'simple-icons:graphql', color: '#E10098' },

  // Frontend
  React: { icon: 'simple-icons:react', color: '#61DAFB' },
  'React Native': { icon: 'simple-icons:react', color: '#61DAFB' },
  'Next.js': { icon: 'simple-icons:nextdotjs', color: '#000000' },
  Vite: { icon: 'simple-icons:vite', color: '#646CFF' },
  'Tailwind CSS': { icon: 'simple-icons:tailwindcss', color: '#06B6D4' },
  'shadcn/ui': { icon: 'simple-icons:shadcnui', color: '#000000' },
  Redux: { icon: 'simple-icons:redux', color: '#764ABC' },
  Zustand: { icon: 'mdi:bear', color: '#443E38' },
  Electron: { icon: 'simple-icons:electron', color: '#47848F' },

  // Infrastructure - AWS
  EC2: { icon: 'simple-icons:amazonec2', color: '#FF9900' },
  S3: { icon: 'simple-icons:amazons3', color: '#569A31' },
  CloudFront: { icon: 'simple-icons:amazoncloudfront', color: '#FF4F8B' },
  Route53: { icon: 'simple-icons:amazonroute53', color: '#8C4FFF' },
  EKS: { icon: 'simple-icons:amazoneks', color: '#FF9900' },
  RDS: { icon: 'simple-icons:amazonrds', color: '#527FFF' },

  // Container & Orchestration
  Docker: { icon: 'simple-icons:docker', color: '#2496ED' },
  Kubernetes: { icon: 'simple-icons:kubernetes', color: '#326CE5' },
  K3s: { icon: 'simple-icons:k3s', color: '#FFC61C' },

  // CI/CD
  'GitHub Actions': { icon: 'simple-icons:githubactions', color: '#2088FF' },
  ArgoCD: { icon: 'simple-icons:argo', color: '#EF7B4D' },
  Vercel: { icon: 'simple-icons:vercel', color: '#000000' },

  // Monitoring
  Elasticsearch: { icon: 'simple-icons:elasticsearch', color: '#005571' },
  Prometheus: { icon: 'simple-icons:prometheus', color: '#E6522C' },
  Grafana: { icon: 'simple-icons:grafana', color: '#F46800' },
  Loki: { icon: 'simple-icons:grafana', color: '#F46800' },
  CloudWatch: { icon: 'simple-icons:amazoncloudwatch', color: '#FF4F8B' },

  // Networking
  Nginx: { icon: 'simple-icons:nginx', color: '#009639' },

  // AI & ML
  OpenAI: { icon: 'simple-icons:openai', color: '#412991' },
  Claude: { icon: 'simple-icons:anthropic', color: '#CA9B7C' },
  Gemini: { icon: 'simple-icons:googlegemini', color: '#8E75B2' },
  LangChain: { icon: 'simple-icons:langchain', color: '#1C3C3C' },
  Whisper: { icon: 'simple-icons:openai', color: '#412991' },
  ElevenLabs: { icon: 'mdi:microphone', color: '#000000' },
  MiniMax: { icon: 'mdi:waveform', color: '#FF6B35' },
  HuggingFace: { icon: 'simple-icons:huggingface', color: '#FFD21E' },
  Pinecone: { icon: 'simple-icons:pinecone', color: '#000000' },
  Replicate: { icon: 'simple-icons:replicate', color: '#000000' },
  'fal.ai': { icon: 'mdi:rocket-launch', color: '#7C3AED' },
  PyTorch: { icon: 'simple-icons:pytorch', color: '#EE4C2C' },

  // Blockchain
  Solidity: { icon: 'simple-icons:solidity', color: '#363636' },
  'Web3.js': { icon: 'simple-icons:web3dotjs', color: '#F16822' },
  'Ethers.js': { icon: 'simple-icons:ethereum', color: '#3C3C3D' },
  Ethereum: { icon: 'simple-icons:ethereum', color: '#3C3C3D' },
  Polygon: { icon: 'simple-icons:polygon', color: '#8247E5' },
  MetaMask: { icon: 'simple-icons:metamask', color: '#F6851B' },
  IPFS: { icon: 'simple-icons:ipfs', color: '#65C2CB' },

  // Collaboration
  Notion: { icon: 'simple-icons:notion', color: '#000000' },
  Jira: { icon: 'simple-icons:jira', color: '#0052CC' },
  Basecamp: { icon: 'simple-icons:basecamp', color: '#1D2D35' },
  Slack: { icon: 'simple-icons:slack', color: '#4A154B' },
  'Google Workspace': { icon: 'simple-icons:google', color: '#4285F4' },
  Teams: { icon: 'simple-icons:microsoftteams', color: '#6264A7' },
  GitHub: { icon: 'simple-icons:github', color: '#181717' },
  GitLab: { icon: 'simple-icons:gitlab', color: '#FC6D26' },
  Figma: { icon: 'simple-icons:figma', color: '#F24E1E' },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// 카테고리별 아이콘 매핑
const categoryIcons: Record<string, { icon: string; color: string }> = {
  'Backend Engineering': { icon: 'mdi:server', color: '#3B82F6' },
  'Frontend Engineering': { icon: 'mdi:application-outline', color: '#A855F7' },
  'Infrastructure & DevOps': { icon: 'mdi:cloud', color: '#10B981' },
  'AI Engineering': { icon: 'mdi:brain', color: '#EC4899' },
  Blockchain: { icon: 'mdi:cube', color: '#F59E0B' },
  'Collaboration & Tools': { icon: 'mdi:account-group', color: '#06B6D4' },
}

export default function TechStack({ categories }: { categories: TechCategory[] }) {
  const { t } = useI18n()

  return (
    <motion.div className="mt-12 not-prose" variants={container} initial="hidden" animate="show">
      <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Icon icon="mdi:cog-outline" className="text-3xl text-primary-500" />
        {t('pages.about.techStack')}
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((category) => {
          const categoryIcon = categoryIcons[category.title]
          return (
            <motion.div
              key={category.title}
              variants={item}
              className="group relative rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/10 dark:hover:shadow-primary-500/10"
              style={{
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
              }}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                {categoryIcon && (
                  <Icon
                    icon={categoryIcon.icon}
                    className="text-2xl"
                    style={{ color: categoryIcon.color }}
                  />
                )}
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {category.title}
                </h3>
              </div>

              {/* Tech Items */}
              <div className="space-y-3">
                {category.techs.map((tech, idx) => (
                  <div key={tech.name || idx}>
                    {tech.name && (
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {tech.name}
                      </h4>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {tech.items.map((t) => {
                        const techInfo = techIcons[t]
                        return (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border"
                            style={{
                              borderColor: techInfo
                                ? `${techInfo.color}30`
                                : 'rgba(209, 213, 219, 0.3)',
                              boxShadow: techInfo
                                ? `0 0 0 1px ${techInfo.color}15, 0 1px 2px ${techInfo.color}10`
                                : '0 1px 2px rgba(0, 0, 0, 0.05)',
                            }}
                          >
                            {techInfo && (
                              <Icon
                                icon={techInfo.icon}
                                className="text-base shrink-0"
                                style={{ color: techInfo.color }}
                              />
                            )}
                            <span>{t}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtle Hover Effect */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: categoryIcon
                    ? `linear-gradient(135deg, ${categoryIcon.color}05, transparent)`
                    : 'transparent',
                }}
              />
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
