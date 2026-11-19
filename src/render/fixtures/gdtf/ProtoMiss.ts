/**
 * Why a planned GDTF model is not drawn: a model file a drawn part needs cannot be drawn, the model is too detailed,
 * or the rig has drawn its budget; `triangles` is the model's count, or the budget.
 */
export interface ProtoMiss {
  readonly kind: 'unread' | 'dense' | 'budget';
  readonly triangles: number;
}
