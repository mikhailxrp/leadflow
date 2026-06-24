'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import { PipelineCardOverlay } from '@/components/pipeline/PipelineCard';
import PipelineColumn, { type PipelineLead } from '@/components/pipeline/PipelineColumn';

const LEAD_DETAIL_PATH = '/leads/1';
const DRAG_ACTIVATION_DISTANCE_PX = 8;
const DND_CONTEXT_ID = 'pipeline-board';

interface PipelineStage {
  id: string;
  title: string;
  accentClass: string;
  leads: PipelineLead[];
}

const INITIAL_STAGES: PipelineStage[] = [
  {
    id: 'new',
    title: 'Новый лид',
    accentClass: 'bg-[#3b82f6]',
    leads: [
      {
        id: '1',
        name: 'ООО «Альфа Строй»',
        phone: '+7 (999) 123-45-67',
        tags: ['Сайт', 'Горячий'],
        manager: 'Александр В.',
      },
      {
        id: '2',
        name: 'ИП Смирнов А.А.',
        phone: '+7 (903) 987-65-43',
        tags: ['Telegram'],
        manager: 'Мария С.',
      },
      {
        id: '3',
        name: 'Виктор Николаевич',
        phone: '+7 (916) 444-55-66',
        tags: ['Звонок', 'Уточнить'],
        manager: 'Александр В.',
      },
      {
        id: '4',
        name: 'ЗАО «ТехПром»',
        phone: '+7 (495) 111-22-33',
        tags: ['Email'],
        manager: 'Иван К.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Первичный контакт',
    accentClass: 'bg-[#8b5cf6]',
    leads: [
      {
        id: '5',
        name: 'Сеть «Магнит»',
        phone: '+7 (800) 555-35-35',
        tags: ['Выставка'],
        manager: 'Мария С.',
      },
      {
        id: '6',
        name: 'Елена (Дизайн)',
        phone: '+7 (926) 777-88-99',
        tags: ['VK', 'Перезвонить'],
        manager: 'Иван К.',
      },
      {
        id: '7',
        name: 'ГК «Монолит»',
        phone: '+7 (499) 333-22-11',
        tags: ['Сайт'],
        manager: 'Александр В.',
      },
    ],
  },
  {
    id: 'in-progress',
    title: 'В работе',
    accentClass: 'bg-[#f59e0b]',
    leads: [
      {
        id: '8',
        name: 'ОАО «РЖД Логистика»',
        phone: '+7 (495) 262-99-01',
        tags: ['Тендер', 'КП отправлено'],
        manager: 'Александр В.',
      },
      {
        id: '9',
        name: 'ИП Кузнецова',
        phone: '+7 (905) 112-23-34',
        tags: ['Telegram'],
        manager: 'Мария С.',
      },
      {
        id: '10',
        name: 'Фитнес «Олимп»',
        phone: '+7 (812) 555-44-33',
        tags: ['Звонок', 'Встреча'],
        manager: 'Иван К.',
      },
    ],
  },
  {
    id: 'warm',
    title: 'Тёплый клиент',
    accentClass: 'bg-[#10b981]',
    leads: [
      {
        id: '11',
        name: 'Ресторан «Пушкин»',
        phone: '+7 (495) 739-00-33',
        tags: ['Партнёры', 'Договор'],
        manager: 'Мария С.',
      },
      {
        id: '12',
        name: 'ООО «Веб Интеграция»',
        phone: '+7 (911) 222-33-44',
        tags: ['Сайт'],
        manager: 'Александр В.',
      },
      {
        id: '13',
        name: 'Алексей (Инвестор)',
        phone: '+7 (999) 888-77-66',
        tags: ['Рекомендация'],
        manager: 'Иван К.',
      },
    ],
  },
  {
    id: 'deal',
    title: 'Сделка',
    accentClass: 'bg-[#22c55e]',
    leads: [
      {
        id: '14',
        name: 'Группа «Самолет»',
        phone: '+7 (495) 567-89-00',
        tags: ['Тендер', 'Оплачено'],
        manager: 'Александр В.',
      },
      {
        id: '15',
        name: 'ИП Васильев',
        phone: '+7 (960) 333-44-55',
        tags: ['Звонок'],
        manager: 'Мария С.',
      },
    ],
  },
];

function findLead(stages: PipelineStage[], leadId: string): PipelineLead | undefined {
  return stages.flatMap((stage) => stage.leads).find((lead) => lead.id === leadId);
}

function findStageIdByLeadId(stages: PipelineStage[], leadId: string): string | undefined {
  return stages.find((stage) => stage.leads.some((lead) => lead.id === leadId))?.id;
}

function resolveOverStageId(stages: PipelineStage[], overId: string): string | undefined {
  const stageByLead = findStageIdByLeadId(stages, overId);
  if (stageByLead) {
    return stageByLead;
  }

  if (stages.some((stage) => stage.id === overId)) {
    return overId;
  }

  return undefined;
}

function moveLead(
  stages: PipelineStage[],
  activeId: string,
  overId: string,
): PipelineStage[] {
  const activeLead = findLead(stages, activeId);
  const activeStageId = findStageIdByLeadId(stages, activeId);
  const overStageId = resolveOverStageId(stages, overId);

  if (!activeLead || !activeStageId || !overStageId) {
    return stages;
  }

  if (activeStageId === overStageId) {
    return stages.map((stage) => {
      if (stage.id !== activeStageId) {
        return stage;
      }

      const oldIndex = stage.leads.findIndex((lead) => lead.id === activeId);
      const newIndex = stage.leads.findIndex((lead) => lead.id === overId);

      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return stage;
      }

      return {
        ...stage,
        leads: arrayMove(stage.leads, oldIndex, newIndex),
      };
    });
  }

  return stages.map((stage) => {
    if (stage.id === activeStageId) {
      return {
        ...stage,
        leads: stage.leads.filter((lead) => lead.id !== activeId),
      };
    }

    if (stage.id === overStageId) {
      const leadsWithoutActive = stage.leads.filter((lead) => lead.id !== activeId);
      const overIndex = leadsWithoutActive.findIndex((lead) => lead.id === overId);
      const nextLeads = [...leadsWithoutActive];

      if (overId === overStageId || overIndex < 0) {
        nextLeads.push(activeLead);
      } else {
        nextLeads.splice(overIndex, 0, activeLead);
      }

      return {
        ...stage,
        leads: nextLeads,
      };
    }

    return stage;
  });
}

export default function PipelineBoard(): ReactNode {
  const router = useRouter();
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);
  const [activeLead, setActiveLead] = useState<PipelineLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    const lead = findLead(stages, String(event.active.id));
    setActiveLead(lead ?? null);
  }, [stages]);

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    setStages((currentStages) => {
      const nextStages = moveLead(currentStages, activeId, overId);
      const prevStageId = findStageIdByLeadId(currentStages, activeId);
      const nextStageId = findStageIdByLeadId(nextStages, activeId);

      if (prevStageId && nextStageId && prevStageId !== nextStageId) {
        // TODO: сохранить новый этап лида через API
        console.log(`Lead ${activeId}: ${prevStageId} → ${nextStageId}`);
      }

      return nextStages;
    });
  }, []);

  const handleDragCancel = useCallback((): void => {
    setActiveLead(null);
  }, []);

  const handleCardClick = useCallback((): void => {
    router.push(LEAD_DETAIL_PATH);
  }, [router]);

  return (
    <DndContext
      id={DND_CONTEXT_ID}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="custom-scrollbar flex flex-row gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stageId={stage.id}
            title={stage.title}
            accentClass={stage.accentClass}
            leads={stage.leads}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <PipelineCardOverlay
            name={activeLead.name}
            phone={activeLead.phone}
            tags={activeLead.tags}
            manager={activeLead.manager}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
