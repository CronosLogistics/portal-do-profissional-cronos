import { queryOptions } from "@tanstack/react-query";
import { meusFeedbacksGestor } from "@/lib/feedback-gestor.functions";

export const LINK_FEEDBACK_GESTOR = "https://cronoslogisticscombr.sharepoint.com/:l:/s/peoplemanagementteamgroup/JAAToOwk4xozT44Z4WUziAj-ASE43dBrgXfNHS5oDD45mSs?nav=OWNiNjg3OGItYmY5Ni00OGRkLTkyM2MtODg2Mjc1MTZjYTcx";
export const feedbacksQuery = queryOptions({ queryKey: ["feedbacks-gestor-recebidos"], queryFn: () => meusFeedbacksGestor(), staleTime: 60_000 });
